import { z } from "zod";
import { orderIdParamSchema, orderStatusSchema } from "@/lib/schemas/order-status";

export const BULK_MAX_IDS = 100;

/**
 * Cuerpo de PATCH /api/orders/bulk (docs/API.md): { ids: string[] (1–100, únicos), status }.
 */
export const bulkUpdateSchema = z.object({
  ids: z
    .array(orderIdParamSchema, { error: "ids debe ser una lista de identificadores de pedido." })
    .min(1, { error: "Selecciona al menos un pedido." })
    .max(BULK_MAX_IDS, { error: `Puedes actualizar como máximo ${BULK_MAX_IDS} pedidos a la vez.` })
    .refine((ids) => new Set(ids).size === ids.length, { error: "La lista de pedidos tiene ids repetidos." }),
  status: orderStatusSchema,
});

export type BulkUpdateInput = z.infer<typeof bulkUpdateSchema>;
