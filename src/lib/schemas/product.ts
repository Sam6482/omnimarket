
import { z } from "zod";

export const createProductSchema = z.object({
  sku: z
    .string()
    .regex(
      /^[A-Z0-9-]{3,32}$/,
      "El SKU debe tener entre 3 y 32 caracteres: A-Z, 0-9 o guiones."
    ),
  name: z.string().trim().min(1).max(150),
  category: z.string().trim().min(1).max(100),
  priceCents: z.number().int().nonnegative(),
  costCents: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
  category: z.string().trim().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;
