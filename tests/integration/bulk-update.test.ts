import { describe, expect, it, vi } from "vitest";
import type { OrderStatus } from "@prisma/client";

vi.mock("@/server/db", () => ({ prisma: {} }));

import { POSITION_STEP, bulkUpdateOrderStatus, type BulkUpdateDb } from "@/server/services/orders/bulk-update";

type Row = { id: string; status: OrderStatus; position: number; updatedAt: Date };

/**
 * Base en memoria con transacción real (copia y confirma o descarta), para comprobar
 * que una actualización masiva es todo o nada.
 */
function createDb(initial: Row[], options: { concurrentChangeOn?: string } = {}) {
  let committed = initial.map((row) => ({ ...row }));
  let committedEvents: Array<Record<string, unknown>> = [];

  const db = {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      const rows = committed.map((row) => ({ ...row }));
      const events = [...committedEvents];
      const tx = {
        order: {
          findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
            rows.filter((row) => where.id.in.includes(row.id)).map(({ id, status, updatedAt }) => ({ id, status, updatedAt }))
          ),
          aggregate: vi.fn(async ({ where }: { where: { status: OrderStatus } }) => {
            const positions = rows.filter((row) => row.status === where.status).map((row) => row.position);
            return { _min: { position: positions.length ? Math.min(...positions) : null } };
          }),
          updateMany: vi.fn(
            async ({ where, data }: { where: { id: string; updatedAt: Date }; data: Partial<Row> }) => {
              const row = rows.find((candidate) => candidate.id === where.id);
              if (options.concurrentChangeOn === where.id && row) row.updatedAt = new Date(row.updatedAt.getTime() + 5);
              if (!row || row.updatedAt.getTime() !== where.updatedAt.getTime()) return { count: 0 };
              Object.assign(row, data);
              return { count: 1 };
            }
          ),
        },
        orderEvent: {
          createMany: vi.fn(async ({ data }: { data: Array<Record<string, unknown>> }) => {
            events.push(...data);
            return { count: data.length };
          }),
        },
      };
      const result = await fn(tx); // si lanza, no se confirma nada
      committed = rows;
      committedEvents = events;
      return result;
    }),
  };

  return {
    db: db as unknown as BulkUpdateDb,
    rows: () => committed,
    events: () => committedEvents,
  };
}

const T0 = new Date("2026-10-24T18:00:00.000Z");
const seed = (): Row[] => [
  { id: "o1", status: "PENDING", position: 1000, updatedAt: T0 },
  { id: "o2", status: "PENDING", position: 2000, updatedAt: T0 },
  { id: "o3", status: "SHIPPED", position: 1000, updatedAt: T0 },
  { id: "o4", status: "SHIPPED", position: 2000, updatedAt: T0 },
];

describe("bulkUpdateOrderStatus", () => {
  it("mueve los pedidos al inicio de la columna destino, en orden, y registra un evento por cambio", async () => {
    const store = createDb(seed());

    const result = await bulkUpdateOrderStatus({ input: { ids: ["o2", "o1"], status: "SHIPPED" }, actorId: "user-1" }, store.db);

    expect(result).toEqual({ ok: true, updated: 2, unchanged: 0 });
    const byId = Object.fromEntries(store.rows().map((row) => [row.id, row]));
    // Columna SHIPPED empieza en 1000: o2 y o1 quedan arriba, en el orden recibido.
    expect(byId.o2).toMatchObject({ status: "SHIPPED", position: 1000 - 2 * POSITION_STEP });
    expect(byId.o1).toMatchObject({ status: "SHIPPED", position: 1000 - POSITION_STEP });
    const shipped = store.rows().filter((row) => row.status === "SHIPPED").sort((a, b) => a.position - b.position);
    expect(shipped.map((row) => row.id)).toEqual(["o2", "o1", "o3", "o4"]);
    expect(byId.o1.updatedAt.getTime()).toBeGreaterThan(T0.getTime());
    expect(store.events()).toEqual([
      expect.objectContaining({ orderId: "o2", fromStatus: "PENDING", toStatus: "SHIPPED", actorId: "user-1" }),
      expect.objectContaining({ orderId: "o1", fromStatus: "PENDING", toStatus: "SHIPPED", actorId: "user-1" }),
    ]);
  });

  it("no toca ni registra eventos para pedidos que ya están en el estado destino", async () => {
    const store = createDb(seed());

    const result = await bulkUpdateOrderStatus({ input: { ids: ["o1", "o3"], status: "SHIPPED" }, actorId: null }, store.db);

    expect(result).toEqual({ ok: true, updated: 1, unchanged: 1 });
    expect(store.rows().find((row) => row.id === "o3")).toMatchObject({ position: 1000, updatedAt: T0 });
    expect(store.events()).toHaveLength(1);
  });

  it("I2: si falta algún id responde NOT_FOUND con missingIds y no modifica nada", async () => {
    const store = createDb(seed());
    const before = JSON.stringify(store.rows());

    const result = await bulkUpdateOrderStatus(
      { input: { ids: ["o1", "no-existe", "o2", "tampoco"], status: "DELIVERED" }, actorId: null },
      store.db
    );

    expect(result).toMatchObject({ ok: false, error: { code: "NOT_FOUND", details: { missingIds: ["no-existe", "tampoco"] } } });
    expect(JSON.stringify(store.rows())).toBe(before);
    expect(store.events()).toHaveLength(0);
  });

  it("si otro usuario cambia un pedido a mitad del lote, revierte todo y responde CONFLICT", async () => {
    const store = createDb(seed(), { concurrentChangeOn: "o2" });
    const before = JSON.stringify(store.rows());

    const result = await bulkUpdateOrderStatus({ input: { ids: ["o1", "o2"], status: "DELIVERED" }, actorId: null }, store.db);

    expect(result).toMatchObject({ ok: false, error: { code: "CONFLICT", details: { orderIds: ["o2"] } } });
    // o1 se había actualizado dentro de la transacción, pero no se confirmó.
    expect(JSON.stringify(store.rows())).toBe(before);
    expect(store.events()).toHaveLength(0);
  });

  it("empieza en POSITION_STEP si la columna destino está vacía", async () => {
    const store = createDb(seed());

    await bulkUpdateOrderStatus({ input: { ids: ["o1"], status: "CANCELLED" }, actorId: null }, store.db);

    expect(store.rows().find((row) => row.id === "o1")).toMatchObject({ status: "CANCELLED", position: POSITION_STEP });
  });
});
