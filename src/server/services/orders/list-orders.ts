
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { formatOrderNumber } from "@/lib/order-number";
import type { OrderQuery } from "@/lib/schemas/order";

export function buildOrderFilter(
  query: OrderQuery
): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};

  if (query.status) {
    where.status = query.status;
  }

  if (query.q) {
    const search = query.q.trim();
    const numberMatch = /^OM-(\d+)$/i.exec(search);

    where.OR = [
      {
        customerName: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        customerEmail: {
          contains: search,
          mode: "insensitive",
        },
      },
      ...(numberMatch
        ? [{ number: Number(numberMatch[1]) }]
        : []),
    ];
  }

  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from
        ? { gte: new Date(query.from) }
        : {}),
      ...(query.to
        ? { lte: new Date(query.to) }
        : {}),
    };
  }

  return where;
}

export async function listOrders(query: OrderQuery) {
  const { page, limit, sort } = query;
  const where = buildOrderFilter(query);

  const [sortField, sortDirection] = sort.split(":") as [
    "createdAt",
    "asc" | "desc",
  ];

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
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
      orderBy: [
        { [sortField]: sortDirection },
        { id: "asc" },
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    data: orders.map((order) => ({
      ...order,
      number: formatOrderNumber(order.number),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
    },
  };
}
