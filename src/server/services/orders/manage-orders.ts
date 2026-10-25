
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

export async function updateOrder(
  id: string,
  input: UpdateOrderInput
) {
  const order = await prisma.order.update({
    where: { id },
    data: input,
    select: orderSelect,
  });

  return formatOrder(order);
}

export async function deleteOrder(id: string) {
  await prisma.order.delete({
    where: { id },
    select: { id: true },
  });
}
