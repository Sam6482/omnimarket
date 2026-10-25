
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import type { ProductQuery } from "@/lib/schemas/product";

export async function listProducts(query: ProductQuery) {
  const { page, limit, q, category } = query;

  const where: Prisma.ProductWhereInput = {
    ...(q
      ? {
          OR: [
            {
              name: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              sku: {
                contains: q,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
    ...(category
      ? {
          category: {
            equals: category,
            mode: "insensitive",
          },
        }
      : {}),
  };

  const [total, data] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
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
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
    },
  };
}
