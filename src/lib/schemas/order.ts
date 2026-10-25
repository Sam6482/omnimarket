
import { z } from "zod";
import { orderStatusSchema } from "@/lib/schemas/order-status";

// ========================================
// CONSULTAR Y FILTRAR PEDIDOS
// ========================================

const isoDateSchema = z.string().datetime({ offset: true });

export const orderQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(100).default(20),

    status: orderStatusSchema.optional(),

    q: z.string().trim().optional(),

    from: isoDateSchema.optional(),

    to: isoDateSchema.optional(),

    sort: z
      .enum(["createdAt:desc", "createdAt:asc"])
      .default("createdAt:desc"),
  })
  .refine(
    (query) =>
      !query.from ||
      !query.to ||
      new Date(query.from) <= new Date(query.to),
    {
      message: "La fecha inicial no puede superar la final.",
      path: ["to"],
    }
  );

export type OrderQuery = z.infer<typeof orderQuerySchema>;

// ========================================
// VALIDACIÓN DE ARTÍCULOS
// ========================================

const orderItemSchema = z.object({
  productId: z.string().min(1),

  quantity: z.number().int().min(1).max(999),
});

const orderItemsSchema = z
  .array(orderItemSchema)
  .min(1)
  .superRefine((items, context) => {
    const quantities = new Map<string, number>();

    for (const item of items) {
      const total =
        (quantities.get(item.productId) ?? 0) +
        item.quantity;

      if (total > 999) {
        context.addIssue({
          code: "custom",
          message:
            "Máximo 999 unidades por producto, incluyendo artículos repetidos.",
          path: ["items"],
        });
        return;
      }

      quantities.set(item.productId, total);
    }
  });

// ========================================
// CREAR PEDIDOS
// ========================================

export const createOrderSchema = z.object({
  customerName: z.string().trim().min(1).max(150),

  customerEmail: z.email(),

  status: orderStatusSchema.optional(),

  items: orderItemsSchema,
});

export type CreateOrderInput = z.infer<
  typeof createOrderSchema
>;

// ========================================
// EDITAR PEDIDOS
// ========================================

export const updateOrderSchema = z
  .object({
    customerName: z
      .string()
      .trim()
      .min(1)
      .max(150)
      .optional(),

    customerEmail: z.email().optional(),

    items: orderItemsSchema.optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.customerName !== undefined ||
      data.customerEmail !== undefined ||
      data.items !== undefined,
    {
      message: "Debes enviar al menos un campo.",
    }
  );

export type UpdateOrderInput = z.infer<
  typeof updateOrderSchema
>;
