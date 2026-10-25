import type { OrderStatus, PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db";
import type { BulkUpdateInput } from "@/lib/schemas/bulk";
import { ORDER_STATUS_CHANGED_EVENT, nextVersion } from "@/server/services/orders/update-status";

/**
 * Actualización masiva de estado — PATCH /api/orders/bulk (docs/API.md, R8).
 *
 * - Todo o nada: una sola transacción. Si falta algún id → NOT_FOUND con `missingIds`
 *   y no se modifica nada. Si otro usuario cambió un pedido durante la operación → CONFLICT
 *   y se revierte todo (First Writer Wins, igual que el movimiento individual).
 * - Los pedidos que ya están en el estado destino no se tocan (no cuentan como actualizados).
 * - Los pedidos movidos se colocan al INICIO de la columna destino, en el orden recibido.
 *   Así quedan dentro de las primeras 50 tarjetas que carga el Kanban (kanban-status) y no
 *   chocan con posiciones existentes (misma regla que el movimiento individual del tablero).
 * - Cada cambio de estado registra un OrderEvent en la misma transacción.
 */

export const POSITION_STEP = 1000;

export type BulkUpdateResult =
  | { ok: true; updated: number; unchanged: number }
  | { ok: false; error: { code: "NOT_FOUND"; message: string; details: { missingIds: string[] } } }
  | { ok: false; error: { code: "CONFLICT"; message: string; details: { orderIds: string[] } } };

export type BulkUpdateDb = Pick<PrismaClient, "$transaction">;

/** Se lanza dentro de la transacción para forzar el rollback ante una escritura concurrente. */
class BulkConflictError extends Error {
  constructor(readonly orderIds: string[]) {
    super("Conflicto de concurrencia en actualización masiva");
  }
}

type OrderSnapshot = { id: string; status: OrderStatus; updatedAt: Date };

export async function bulkUpdateOrderStatus(
  { input, actorId }: { input: BulkUpdateInput; actorId: string | null },
  db: BulkUpdateDb = prisma
): Promise<BulkUpdateResult> {
  const { ids, status } = input;

  try {
    return await db.$transaction(async (tx): Promise<BulkUpdateResult> => {
      const found: OrderSnapshot[] = await tx.order.findMany({
        where: { id: { in: ids } },
        select: { id: true, status: true, updatedAt: true },
      });

      const byId = new Map(found.map((order) => [order.id, order]));
      const missingIds = ids.filter((id) => !byId.has(id));
      if (missingIds.length > 0) {
        return {
          ok: false,
          error: {
            code: "NOT_FOUND",
            message: `No existen ${missingIds.length} de los pedidos seleccionados. No se modificó ninguno.`,
            details: { missingIds },
          },
        };
      }

      // Orden recibido (el que ve el usuario) y solo los que realmente cambian de estado.
      const toMove = ids.map((id) => byId.get(id) as OrderSnapshot).filter((order) => order.status !== status);
      if (toMove.length === 0) return { ok: true, updated: 0, unchanged: ids.length };

      // Posiciones por encima de la primera tarjeta actual: first < second < ... < min(columna).
      const { _min } = await tx.order.aggregate({ where: { status }, _min: { position: true } });
      const top = _min.position ?? (toMove.length + 1) * POSITION_STEP;

      for (const [index, order] of toMove.entries()) {
        const position = top - (toMove.length - index) * POSITION_STEP;
        const { count } = await tx.order.updateMany({
          where: { id: order.id, updatedAt: order.updatedAt },
          data: { status, position, updatedAt: nextVersion(order.updatedAt) },
        });
        if (count === 0) throw new BulkConflictError([order.id]);
      }

      await tx.orderEvent.createMany({
        data: toMove.map((order) => ({
          orderId: order.id,
          eventType: ORDER_STATUS_CHANGED_EVENT,
          fromStatus: order.status,
          toStatus: status,
          actorId,
        })),
      });

      return { ok: true, updated: toMove.length, unchanged: ids.length - toMove.length };
    }, { maxWait: 10_000, timeout: 20_000 });
  } catch (error) {
    if (error instanceof BulkConflictError) {
      return {
        ok: false,
        error: {
          code: "CONFLICT",
          message: "Otro usuario modificó alguno de los pedidos al mismo tiempo. No se aplicó ningún cambio.",
          details: { orderIds: error.orderIds },
        },
      };
    }
    throw error;
  }
}
