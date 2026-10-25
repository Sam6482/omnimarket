
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { formatOrderNumber } from "@/lib/order-number";
import type { CreateOrderInput } from "@/lib/schemas/order";

export class MissingProductsError extends Error {
  constructor() {
    super("Uno o más productos no existen.");
    this.name = "MissingProductsError";
  }
}

export async function createOrder(
  input: CreateOrderInput,
  createdById?: string
) {
  const quantities = new Map<string, number>();

  for (const item of input.items) {
    quantities.set(
      item.productId,
      (quantities.get(item.productId) ?? 0) + item.quantity
    );
  }

  const ids = [...quantities.keys()];

  return prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        priceCents: true,
        costCents: true,
      },
    });

    if (products.length !== ids.length) {
      throw new MissingProductsError();
    }

    const totalCents = products.reduce(
      (sum, product) =>
        sum +
        product.priceCents * (quantities.get(product.id) ?? 0),
      0
    );

    const costCents = products.reduce(
      (sum, product) =>
        sum +
        product.costCents * (quantities.get(product.id) ?? 0),
      0
    );

    const itemsCount = [...quantities.values()].reduce(
      (sum, quantity) => sum + quantity,
      0
    );

    if (
      !Number.isSafeInteger(totalCents) ||
      !Number.isSafeInteger(costCents)
    ) {
      throw new Error("Los importes exceden el rango permitido.");
    }

    const order = await tx.order.create({
      data: {
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        status: input.status ?? "PENDING",
        totalCents,
        costCents,
        itemsCount,
        ...(createdById ? { createdById } : {}),
        items: {
          create: products.map((product) => ({
            productId: product.id,
            quantity: quantities.get(product.id)!,
            unitPriceCents: product.priceCents,
            unitCostCents: product.costCents,
          })),
        },
      },
      select: {
        id: true,
        number: true,
        customerName: true,
        customerEmail: true,
        status: true,
        position: true,
        totalCents: true,
        costCents: true,
        itemsCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...order,
      number: formatOrderNumber(order.number),
    };
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}
