
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { formatOrderNumber } from "@/lib/order-number";
import type { UpdateOrderInput } from "@/lib/schemas/order";

const orderSelect = {
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
} satisfies Prisma.OrderSelect;

function formatOrder<T extends { number: number }>(order: T) {
  return { ...order, number: formatOrderNumber(order.number) };
}

export async function getOrder(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      ...orderSelect,
      items: {
        select: {
          id: true,
          quantity: true,
          unitPriceCents: true,
          unitCostCents: true,
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return order ? formatOrder(order) : null;
}


export class MissingOrderProductsError extends Error {
  constructor() {
    super("Uno o más productos del pedido no existen.");
    this.name = "MissingOrderProductsError";
  }
}


export async function updateOrder(
  id: string,
  input: UpdateOrderInput
) {
  return prisma.$transaction(
    async (tx) => {
      const current = await tx.order.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!current) {
        throw new Prisma.PrismaClientKnownRequestError(
          "El pedido no existe.",
          {
            code: "P2025",
            clientVersion: Prisma.prismaVersion.client,
          }
        );
      }

      // Si no se modifican artículos, conservamos
      // exactamente los importes históricos.
      if (input.items === undefined) {
        const updated = await tx.order.update({
          where: { id },
          data: {
            customerName: input.customerName,
            customerEmail: input.customerEmail,
          },
          select: orderSelect,
        });

        return formatOrder(updated);
      }

      const quantities = new Map<string, number>();

      for (const item of input.items) {
        const next =
          (quantities.get(item.productId) ?? 0) + item.quantity;

        if (next > 999) {
          throw new Error("Cantidad máxima excedida.");
        }

        quantities.set(item.productId, next);
      }

      const productIds = [...quantities.keys()];

      const products = await tx.product.findMany({
        where: {
          id: { in: productIds },
        },
        select: {
          id: true,
          priceCents: true,
          costCents: true,
        },
      });

      if (products.length !== productIds.length) {
        throw new MissingOrderProductsError();
      }

      const totalCents = products.reduce(
        (sum, product) =>
          sum +
          product.priceCents *
            (quantities.get(product.id) ?? 0),
        0
      );

      const costCents = products.reduce(
        (sum, product) =>
          sum +
          product.costCents *
            (quantities.get(product.id) ?? 0),
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
        throw new Error("Los importes exceden el rango seguro.");
      }

      const updated = await tx.order.update({
        where: { id },
        data: {
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          totalCents,
          costCents,
          itemsCount,

          // Reemplazamos los artículos dentro de
          // la misma transacción que actualiza totales.
          items: {
            deleteMany: {},
            create: products.map((product) => ({
              productId: product.id,
              quantity: quantities.get(product.id)!,
              unitPriceCents: product.priceCents,
              unitCostCents: product.costCents,
            })),
          },
        },
        select: orderSelect,
      });

      return formatOrder(updated);
    },
    {
      isolationLevel:
        Prisma.TransactionIsolationLevel.Serializable,
    }
  );
}


export async function deleteOrder(id: string) {
  await prisma.order.delete({
    where: { id },
    select: { id: true },
  });
}
