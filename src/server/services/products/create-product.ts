
import { prisma } from "@/server/db";
import type { CreateProductInput } from "@/lib/schemas/product";

export async function createProduct(input: CreateProductInput) {
  return prisma.product.create({
    data: {
      sku: input.sku,
      name: input.name,
      category: input.category,
      priceCents: input.priceCents,
      costCents: input.costCents,
      stock: input.stock,
    },
    select: {
      id: true,
      sku: true,
      name: true,
      category: true,
      priceCents: true,
      costCents: true,
      stock: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
