import { describe, expect, it, vi } from "vitest";

// El servicio importa el cliente real por defecto; aquí se sustituye para no tocar Neon.
vi.mock("@/server/db", () => ({ prisma: {} }));

import { resetDomainData, type ResetDataDb } from "@/server/services/reset-data";
import { ORDER_COUNT, ORDER_ITEM_COUNT, PRODUCT_COUNT } from "@/server/seed/dataset";

/** Transacción simulada que registra el orden de cada operación. */
function createMockDb(options: { failOn?: string; locked?: boolean } = {}) {
  const calls: string[] = [];
  const record = (name: string, result: unknown) =>
    vi.fn(async (args?: { data?: unknown[] }) => {
      calls.push(name);
      if (options.failOn === name) throw new Error(`fallo simulado en ${name}`);
      return result ?? { count: args?.data?.length ?? 0 };
    });

  const tx = {
    $queryRaw: vi.fn(async () => {
      calls.push("lock");
      return [{ locked: options.locked ?? true }];
    }),
    $executeRaw: vi.fn(async () => {
      calls.push("setval");
      return 1;
    }),
    orderEvent: { deleteMany: record("orderEvent.deleteMany", { count: 0 }) },
    orderItem: { deleteMany: record("orderItem.deleteMany", { count: 0 }), createMany: record("orderItem.createMany", null) },
    order: { deleteMany: record("order.deleteMany", { count: 0 }), createMany: record("order.createMany", null) },
    product: { deleteMany: record("product.deleteMany", { count: 0 }), createMany: record("product.createMany", null) },
  };
  const db = { $transaction: vi.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)) };
  return { calls, tx, db: db as unknown as ResetDataDb };
}

describe("resetDomainData", () => {
  it("borra y recrea solo tablas de dominio, en orden seguro y dentro de una transacción", async () => {
    const { calls, db } = createMockDb();

    await resetDomainData(db);

    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(calls).toEqual([
      "lock",
      "orderEvent.deleteMany",
      "orderItem.deleteMany",
      "order.deleteMany",
      "product.deleteMany",
      "product.createMany",
      "order.createMany",
      "orderItem.createMany",
      "setval",
    ]);
  });

  it("responde con el contrato de docs/API.md", async () => {
    const { db } = createMockDb();

    const result = await resetDomainData(db);

    expect(result).toEqual({
      ok: true,
      seed: 42,
      counts: { products: PRODUCT_COUNT, orders: ORDER_COUNT, orderItems: ORDER_ITEM_COUNT },
      durationMs: expect.any(Number),
    });
  });

  it("inserta el mismo dataset en cada llamada (idempotente)", async () => {
    const first = createMockDb();
    const second = createMockDb();

    await resetDomainData(first.db);
    await resetDomainData(second.db);

    expect(second.tx.order.createMany.mock.calls).toEqual(first.tx.order.createMany.mock.calls);
    expect(second.tx.orderItem.createMany.mock.calls).toEqual(first.tx.orderItem.createMany.mock.calls);
  });

  it("no borra nada si ya hay otro reset en curso (RESET_IN_PROGRESS)", async () => {
    const { calls, db } = createMockDb({ locked: false });

    const result = await resetDomainData(db);

    expect(result).toEqual({ ok: false, code: "RESET_IN_PROGRESS" });
    expect(calls).toEqual(["lock"]);
  });

  it("propaga el error si falla una inserción (la transacción revierte todo)", async () => {
    const { calls, db } = createMockDb({ failOn: "order.createMany" });

    await expect(resetDomainData(db)).rejects.toThrow("fallo simulado en order.createMany");
    expect(calls).not.toContain("orderItem.createMany");
  });
});
