import type { OrderStatus, PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db";
import type { UpdateOrderStatusInput } from "@/lib/schemas/order-status";

/**
 * Servicio de movimiento de pedidos en el Kanban — PATCH /api/orders/:id/status (docs/API.md).
 *
 * Política de concurrencia: "First Writer Wins" (gana el primero en guardar).
 * - La versión de un pedido es su `updatedAt`.
 * - Si el cliente envía `expectedUpdatedAt` y no coincide con la versión actual → CONFLICT
 *   (STALE_VERSION). Así se detectan cambios hechos por otros desde que el cliente cargó el tablero.
 * - La escritura es condicional (`WHERE id = ? AND updatedAt = <versión leída>`). Si otra
 *   transacción confirmó antes, PostgreSQL reevalúa la condición, no se actualiza ninguna fila
 *   y se responde CONFLICT (CONCURRENT_UPDATE). Nunca se sobrescribe el cambio ganador.
 * - Sin `expectedUpdatedAt` solo se protegen los cambios que ocurren DURANTE esta operación;
 *   los cambios anteriores a la petición no pueden detectarse sin una versión del cliente.
 * - No hay reintentos automáticos.
 *
 * Cada cambio real de estado registra un OrderEvent en la misma transacción (todo o nada).
 * Reordenar dentro de la misma columna guarda la posición sin crear evento.
 *
 * Este servicio NO autentica: la ruta HTTP debe llamar a requireSession() y validar el body
 * con `updateOrderStatusSchema` antes de invocarlo.
 */

export const ORDER_STATUS_CHANGED_EVENT = "STATUS_CHANGED";

export type OrderStatusSnapshot = {
  id: string;
  status: OrderStatus;
  position: number;
  updatedAt: Date;
};

export type ConflictReason = "STALE_VERSION" | "CONCURRENT_UPDATE";

export type UpdateOrderStatusError =
  | {
      code: "NOT_FOUND";
      message: string;
      details: { orderId: string };
    }
  | {
      code: "CONFLICT";
      message: string;
      details: { orderId: string; reason: ConflictReason; currentUpdatedAt: string };
    };

export type UpdateOrderStatusResult =
  | { ok: true; order: OrderStatusSnapshot }
  | { ok: false; error: UpdateOrderStatusError };

/** Código HTTP para cada error del servicio, según docs/API.md. */
export const UPDATE_ORDER_STATUS_HTTP_STATUS = {
  NOT_FOUND: 404,
  CONFLICT: 409,
} as const satisfies Record<UpdateOrderStatusError["code"], number>;

export type UpdateOrderStatusParams = {
  orderId: string;
  input: UpdateOrderStatusInput;
  /** Usuario autenticado que hace el cambio; se guarda en OrderEvent.actorId. */
  actorId: string | null;
};

/** Solo se necesita `$transaction`; permite inyectar un cliente simulado en las pruebas. */
export type OrderStatusDb = Pick<PrismaClient, "$transaction">;

export async function updateOrderStatus(
  { orderId, input, actorId }: UpdateOrderStatusParams,
  db: OrderStatusDb = prisma
): Promise<UpdateOrderStatusResult> {
  const expectedVersion =
    input.expectedUpdatedAt === undefined ? null : new Date(input.expectedUpdatedAt);

  return db.$transaction(async (tx): Promise<UpdateOrderStatusResult> => {
    const current = await tx.order.findUnique({
      where: { id: orderId },
      select: { status: true, position: true, updatedAt: true },
    });

    if (!current) return notFound(orderId);

    if (expectedVersion && expectedVersion.getTime() !== current.updatedAt.getTime()) {
      return conflict(orderId, "STALE_VERSION", current.updatedAt);
    }

    // Movimiento sin cambios: no se escribe, así no se invalida la versión de otros usuarios.
    if (current.status === input.status && current.position === input.position) {
      return {
        ok: true,
        order: { id: orderId, status: current.status, position: current.position, updatedAt: current.updatedAt },
      };
    }

    const updatedAt = nextVersion(current.updatedAt);

    const { count } = await tx.order.updateMany({
      where: { id: orderId, updatedAt: current.updatedAt },
      data: { status: input.status, position: input.position, updatedAt },
    });

    if (count === 0) {
      // Otra transacción confirmó primero (o eliminó el pedido): gana su cambio.
      const latest = await tx.order.findUnique({
        where: { id: orderId },
        select: { updatedAt: true },
      });
      if (!latest) return notFound(orderId);
      return conflict(orderId, "CONCURRENT_UPDATE", latest.updatedAt);
    }

    if (current.status !== input.status) {
      await tx.orderEvent.create({
        data: {
          orderId,
          eventType: ORDER_STATUS_CHANGED_EVENT,
          fromStatus: current.status,
          toStatus: input.status,
          actorId,
        },
      });
    }

    return {
      ok: true,
      order: { id: orderId, status: input.status, position: input.position, updatedAt },
    };
  });
}

/**
 * Nueva versión estrictamente mayor que la anterior. Evita que dos escrituras en el mismo
 * milisegundo (o con relojes desfasados) compartan versión y escapen a la detección de conflictos.
 */
export function nextVersion(previous: Date, now: Date = new Date()): Date {
  return now.getTime() > previous.getTime() ? now : new Date(previous.getTime() + 1);
}

function notFound(orderId: string): UpdateOrderStatusResult {
  return {
    ok: false,
    error: {
      code: "NOT_FOUND",
      message: "El pedido no existe.",
      details: { orderId },
    },
  };
}

function conflict(orderId: string, reason: ConflictReason, currentUpdatedAt: Date): UpdateOrderStatusResult {
  return {
    ok: false,
    error: {
      code: "CONFLICT",
      message:
        reason === "STALE_VERSION"
          ? "El pedido cambió desde que lo cargaste. Actualiza el tablero e inténtalo de nuevo."
          : "Otro usuario modificó el pedido al mismo tiempo. Se conservó su cambio.",
      details: { orderId, reason, currentUpdatedAt: currentUpdatedAt.toISOString() },
    },
  };
}
