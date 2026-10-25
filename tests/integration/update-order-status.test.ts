import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderStatus } from "@prisma/client";

// El servicio importa el cliente real por defecto; aquí se sustituye para no tocar Neon.
vi.mock("@/server/db", () => ({ prisma: {} }));

import {
  ORDER_STATUS_CHANGED_EVENT,
  UPDATE_ORDER_STATUS_HTTP_STATUS,
  nextVersion,
  updateOrderStatus,
  type OrderStatusDb,
} from "@/server/services/orders/update-status";

const ORDER_ID = "order-1";
const V1 = new Date("2026-10-24T18:00:00.000Z");
const NOW = new Date("2026-10-24T18:05:00.000Z");

/** Cliente Prisma simulado: $transaction ejecuta el callback con un `tx` de funciones espía. */
function createMockDb() {
  const tx = {
    order: { findUnique: vi.fn(), updateMany: vi.fn() },
    orderEvent: { create: vi.fn() },
  };
  const db = { $transaction: vi.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)) };
  return { tx, db: db as unknown as OrderStatusDb };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("updateOrderStatus", () => {
  it("cambia estado y posición con escritura condicional y registra OrderEvent", async () => {
    const { tx, db } = createMockDb();
    tx.order.findUnique.mockResolvedValue({ status: "PENDING", position: 1000, updatedAt: V1 });
    tx.order.updateMany.mockResolvedValue({ count: 1 });

    const result = await updateOrderStatus(
      { orderId: ORDER_ID, input: { status: "SHIPPED", position: 1500 }, actorId: "user-1" },
      db
    );

    expect(result).toEqual({
      ok: true,
      order: { id: ORDER_ID, status: "SHIPPED", position: 1500, updatedAt: NOW },
    });
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: ORDER_ID, updatedAt: V1 },
      data: { status: "SHIPPED", position: 1500, updatedAt: NOW },
    });
    expect(tx.orderEvent.create).toHaveBeenCalledWith({
      data: {
        orderId: ORDER_ID,
        eventType: ORDER_STATUS_CHANGED_EVENT,
        fromStatus: "PENDING",
        toStatus: "SHIPPED",
        actorId: "user-1",
      },
    });
  });

  it("reordenar en la misma columna guarda la posición sin crear evento", async () => {
    const { tx, db } = createMockDb();
    tx.order.findUnique.mockResolvedValue({ status: "PENDING", position: 1000, updatedAt: V1 });
    tx.order.updateMany.mockResolvedValue({ count: 1 });

    const result = await updateOrderStatus(
      { orderId: ORDER_ID, input: { status: "PENDING", position: 2500 }, actorId: null },
      db
    );

    expect(result.ok).toBe(true);
    expect(tx.order.updateMany).toHaveBeenCalledOnce();
    expect(tx.orderEvent.create).not.toHaveBeenCalled();
  });

  it("devuelve NOT_FOUND (404) sin escribir si el pedido no existe", async () => {
    const { tx, db } = createMockDb();
    tx.order.findUnique.mockResolvedValue(null);

    const result = await updateOrderStatus(
      { orderId: "missing", input: { status: "SHIPPED", position: 1 }, actorId: null },
      db
    );

    expect(result).toMatchObject({ ok: false, error: { code: "NOT_FOUND", details: { orderId: "missing" } } });
    expect(UPDATE_ORDER_STATUS_HTTP_STATUS.NOT_FOUND).toBe(404);
    expect(tx.order.updateMany).not.toHaveBeenCalled();
  });

  it("devuelve CONFLICT (409, STALE_VERSION) si expectedUpdatedAt es una versión antigua", async () => {
    const { tx, db } = createMockDb();
    tx.order.findUnique.mockResolvedValue({ status: "PROCESSING", position: 1000, updatedAt: V1 });

    const result = await updateOrderStatus(
      {
        orderId: ORDER_ID,
        input: { status: "SHIPPED", position: 1500, expectedUpdatedAt: "2026-10-24T17:59:59.999Z" },
        actorId: "user-2",
      },
      db
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: "CONFLICT", details: { reason: "STALE_VERSION", currentUpdatedAt: V1.toISOString() } },
    });
    expect(UPDATE_ORDER_STATUS_HTTP_STATUS.CONFLICT).toBe(409);
    expect(tx.order.updateMany).not.toHaveBeenCalled();
    expect(tx.orderEvent.create).not.toHaveBeenCalled();
  });

  it("acepta expectedUpdatedAt con desfase horario si representa la misma versión", async () => {
    const { tx, db } = createMockDb();
    tx.order.findUnique.mockResolvedValue({ status: "PENDING", position: 1000, updatedAt: V1 });
    tx.order.updateMany.mockResolvedValue({ count: 1 });

    const result = await updateOrderStatus(
      {
        orderId: ORDER_ID,
        input: { status: "SHIPPED", position: 1000, expectedUpdatedAt: "2026-10-24T12:00:00.000-06:00" },
        actorId: null,
      },
      db
    );

    expect(result.ok).toBe(true);
  });

  it("devuelve CONFLICT (CONCURRENT_UPDATE) si otra transacción guardó primero, sin crear evento", async () => {
    const { tx, db } = createMockDb();
    const winnerVersion = new Date("2026-10-24T18:04:00.000Z");
    tx.order.findUnique
      .mockResolvedValueOnce({ status: "PENDING", position: 1000, updatedAt: V1 })
      .mockResolvedValueOnce({ updatedAt: winnerVersion });
    tx.order.updateMany.mockResolvedValue({ count: 0 });

    const result = await updateOrderStatus(
      { orderId: ORDER_ID, input: { status: "CANCELLED", position: 1000 }, actorId: "user-2" },
      db
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: "CONFLICT", details: { reason: "CONCURRENT_UPDATE", currentUpdatedAt: winnerVersion.toISOString() } },
    });
    expect(tx.orderEvent.create).not.toHaveBeenCalled();
  });

  it("devuelve NOT_FOUND si el pedido se eliminó durante la operación", async () => {
    const { tx, db } = createMockDb();
    tx.order.findUnique
      .mockResolvedValueOnce({ status: "PENDING", position: 1000, updatedAt: V1 })
      .mockResolvedValueOnce(null);
    tx.order.updateMany.mockResolvedValue({ count: 0 });

    const result = await updateOrderStatus(
      { orderId: ORDER_ID, input: { status: "SHIPPED", position: 1 }, actorId: null },
      db
    );

    expect(result).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("no escribe si el movimiento no cambia estado ni posición", async () => {
    const { tx, db } = createMockDb();
    tx.order.findUnique.mockResolvedValue({ status: "SHIPPED", position: 1500, updatedAt: V1 });

    const result = await updateOrderStatus(
      { orderId: ORDER_ID, input: { status: "SHIPPED", position: 1500 }, actorId: null },
      db
    );

    expect(result).toEqual({
      ok: true,
      order: { id: ORDER_ID, status: "SHIPPED", position: 1500, updatedAt: V1 },
    });
    expect(tx.order.updateMany).not.toHaveBeenCalled();
  });

  it("propaga el error si falla el registro del evento (la transacción revierte el cambio)", async () => {
    const { tx, db } = createMockDb();
    tx.order.findUnique.mockResolvedValue({ status: "PENDING", position: 1000, updatedAt: V1 });
    tx.order.updateMany.mockResolvedValue({ count: 1 });
    tx.orderEvent.create.mockRejectedValue(new Error("db down"));

    await expect(
      updateOrderStatus({ orderId: ORDER_ID, input: { status: "SHIPPED", position: 1 }, actorId: null }, db)
    ).rejects.toThrow("db down");
    // La escritura y el evento ocurren dentro de la MISMA transacción.
    expect(db.$transaction).toHaveBeenCalledOnce();
  });
});

describe("First Writer Wins — dos usuarios mueven el mismo pedido a la vez", () => {
  /**
   * Base en memoria que imita la semántica de PostgreSQL relevante:
   * el UPDATE condicional compara la versión vigente al momento de escribir.
   * Ambos usuarios leen la misma versión antes de que cualquiera escriba.
   */
  function createSharedDb() {
    const row: { status: OrderStatus; position: number; updatedAt: Date } = {
      status: "PENDING",
      position: 1000,
      updatedAt: V1,
    };
    const events: Array<{ fromStatus: OrderStatus; toStatus: OrderStatus; actorId: string | null }> = [];

    let readers = 0;
    let releaseReads!: () => void;
    const bothRead = new Promise<void>((resolve) => (releaseReads = resolve));

    const tx = {
      order: {
        findUnique: vi.fn(async () => {
          const snapshot = { ...row };
          readers += 1;
          if (readers === 2) releaseReads();
          if (readers <= 2) await bothRead;
          return snapshot;
        }),
        updateMany: vi.fn(
          async (args: {
            where: { updatedAt: Date };
            data: { status: OrderStatus; position: number; updatedAt: Date };
          }) => {
            if (row.updatedAt.getTime() !== args.where.updatedAt.getTime()) return { count: 0 };
            Object.assign(row, args.data);
            return { count: 1 };
          }
        ),
      },
      orderEvent: {
        create: vi.fn(async (args: { data: (typeof events)[number] }) => {
          events.push(args.data);
          return args.data;
        }),
      },
    };
    const db = { $transaction: vi.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)) };
    return { row, events, db: db as unknown as OrderStatusDb };
  }

  it("conserva el primer cambio confirmado y rechaza el segundo con CONFLICT", async () => {
    const { row, events, db } = createSharedDb();

    const [ana, beto] = await Promise.all([
      updateOrderStatus({ orderId: ORDER_ID, input: { status: "PROCESSING", position: 2000 }, actorId: "ana" }, db),
      updateOrderStatus({ orderId: ORDER_ID, input: { status: "SHIPPED", position: 3000 }, actorId: "beto" }, db),
    ]);

    expect(ana).toMatchObject({ ok: true, order: { status: "PROCESSING", position: 2000 } });
    expect(beto).toMatchObject({ ok: false, error: { code: "CONFLICT", details: { reason: "CONCURRENT_UPDATE" } } });

    // Persistió el cambio ganador, no el del segundo usuario.
    expect(row).toMatchObject({ status: "PROCESSING", position: 2000 });
    // Solo el cambio confirmado dejó rastro en el historial.
    expect(events).toEqual([
      expect.objectContaining({ fromStatus: "PENDING", toStatus: "PROCESSING", actorId: "ana" }),
    ]);
  });
});

describe("nextVersion", () => {
  it("usa la hora actual si es posterior a la versión previa", () => {
    expect(nextVersion(V1, NOW)).toEqual(NOW);
  });

  it("garantiza una versión estrictamente mayor aunque el reloj no avance", () => {
    expect(nextVersion(V1, V1).getTime()).toBe(V1.getTime() + 1);
    expect(nextVersion(NOW, V1).getTime()).toBe(NOW.getTime() + 1);
  });
});
