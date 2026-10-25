import { z } from "zod";

/**
 * Estados del Kanban. Deben coincidir con el enum `OrderStatus` de prisma/schema.prisma
 * (una prueba unitaria verifica que sigan sincronizados).
 * Se declaran aquí, sin importar @prisma/client, para que el esquema pueda usarse
 * también en componentes de cliente.
 */
export const ORDER_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export const orderStatusSchema = z.enum(ORDER_STATUSES, {
  error: "Estado inválido. Valores permitidos: PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED.",
});

/** Identificador de pedido recibido en la URL (`/api/orders/:id/status`). */
export const orderIdParamSchema = z
  .string()
  .trim()
  .min(1, { error: "El id del pedido es obligatorio." })
  .max(64, { error: "El id del pedido es demasiado largo." });

/**
 * Cuerpo de `PATCH /api/orders/:id/status` (docs/API.md).
 * - `position`: número finito (Zod 4 rechaza NaN e Infinity).
 * - `expectedUpdatedAt`: versión que el cliente vio; si no coincide → 409 CONFLICT.
 */
export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
  position: z.number({ error: "La posición debe ser un número finito." }),
  expectedUpdatedAt: z.iso
    .datetime({ offset: true, error: "expectedUpdatedAt debe ser una fecha ISO 8601 con zona horaria." })
    .optional(),
});

export type OrderStatusValue = z.infer<typeof orderStatusSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
