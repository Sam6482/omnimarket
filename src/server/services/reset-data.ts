import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db";
import { buildDataset, type Dataset } from "@/server/seed/dataset";

/**
 * Restaura el dataset determinista (POST /api/test/reset-data · docs/API.md).
 *
 * - Una sola transacción: si algo falla, la base queda exactamente como estaba.
 * - Solo borra y recrea tablas de dominio (OrderEvent, OrderItem, Order, Product).
 *   NUNCA toca User, Account, Session ni VerificationToken (ADR-0001).
 * - Idempotente: ids, números OM-n, fechas y montos son fijos, y la secuencia de
 *   Order.number se reinicia para que el próximo pedido creado sea OM-1201.
 * - Si ya hay un reset en curso, no espera ni se encola: responde RESET_IN_PROGRESS (409).
 */

export type ResetDataSuccess = {
  ok: true;
  seed: number;
  counts: { products: number; orders: number; orderItems: number };
  durationMs: number;
};

export type ResetDataResult = ResetDataSuccess | { ok: false; code: "RESET_IN_PROGRESS" };

/** Solo se necesita `$transaction`; permite inyectar un cliente simulado en las pruebas. */
export type ResetDataDb = Pick<PrismaClient, "$transaction">;

/** Identificador arbitrario y fijo del candado de reset (pg_try_advisory_xact_lock). */
export const RESET_LOCK_KEY = 4_242_001;

const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 30_000 } as const;

let cachedDataset: Dataset | null = null;

function getDataset(): Dataset {
  cachedDataset ??= buildDataset();
  return cachedDataset;
}

export async function resetDomainData(db: ResetDataDb = prisma): Promise<ResetDataResult> {
  const startedAt = performance.now();
  const dataset = getDataset();

  const counts = await db.$transaction(async (tx) => {
    const [lock] = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(${RESET_LOCK_KEY}) AS locked`;
    if (!lock?.locked) return null;

    // Orden seguro respecto a las llaves foráneas (OrderItem → Product es RESTRICT).
    await tx.orderEvent.deleteMany({});
    await tx.orderItem.deleteMany({});
    await tx.order.deleteMany({});
    await tx.product.deleteMany({});

    const products = await tx.product.createMany({ data: dataset.products });
    const orders = await tx.order.createMany({ data: dataset.orders });
    const orderItems = await tx.orderItem.createMany({ data: dataset.orderItems });

    // Los números OM-n se insertan explícitos; la secuencia debe continuar después del último.
    await tx.$executeRaw`SELECT setval(pg_get_serial_sequence('"Order"', 'number'), (SELECT MAX("number") FROM "Order"))`;

    return { products: products.count, orders: orders.count, orderItems: orderItems.count };
  }, TRANSACTION_OPTIONS);

  if (counts === null) return { ok: false, code: "RESET_IN_PROGRESS" };

  return {
    ok: true,
    seed: dataset.seed,
    counts,
    durationMs: Math.round(performance.now() - startedAt),
  };
}
