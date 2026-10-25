
import { z } from "zod";
import { orderStatusSchema } from "@/lib/schemas/order-status";

const isoDateSchema = z
  .string()
  .datetime({ offset: true });

export const orderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: orderStatusSchema.optional(),
  q: z.string().trim().optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  sort: z
    .enum([
      "createdAt:desc",
      "createdAt:asc",
    ])
    .default("createdAt:desc"),
}).refine(
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

export const createOrderSchema = z.object({
  customerName: z.string().trim().min(1).max(150),
  customerEmail: z.email(),
  status: orderStatusSchema.optional(),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().min(1).max(999),
    })
  ).min(1),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;


export const updateOrderSchema = z
  .object({
    customerName: z.string().trim().min(1).max(150).optional(),
    customerEmail: z.email().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debes enviar al menos un campo.",
  });

export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
