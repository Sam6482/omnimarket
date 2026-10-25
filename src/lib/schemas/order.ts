
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
