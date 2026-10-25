
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import type { UpdateProductInput } from "@/lib/schemas/product";

const productSelect = {
  id: true,
  sku: true,
  name: true,
  category: true,
  priceCents: true,
  costCents: true,
  stock: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductSelect;

export async function updateProduct(
  id: string,
  data: UpdateProductInput
) {
  return prisma.product.update({
    where: { id },
    data,
    select: productSelect,
  });
}

export async function deleteProduct(id: string) {
  // La transacción evita borrar un producto mientras
  // una operación concurrente lo está vinculando a pedidos.
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!product) {
      return "NOT_FOUND" as const;
    }

    const linkedOrders = await tx.orderItem.count({
      where: { productId: id },
    });

    if (linkedOrders > 0) {
      return "CONFLICT" as const;
    }

    await tx.product.delete({
      where: { id },
    });

    return "DELETED" as const;
  });
}
