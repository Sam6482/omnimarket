
import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { formatOrderNumber } from "@/lib/order-number";
import { percentage, summarizeFinance } from "@/lib/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statuses = Object.values(OrderStatus);

function errorResponse(message: string) {
  return NextResponse.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message,
        details: {},
      },
    },
    {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

function readInteger(
  value: string | null,
  fallback: number,
  maximum: number
): number | null {
  if (value === null) return fallback;
  if (!/^[0-9]+$/.test(value)) return null;

  const number = Number(value);

  if (!Number.isSafeInteger(number)) return null;
  if (number < 1 || number > maximum) return null;

  return number;
}

function readDate(value: string | null): Date | null {
  if (!value) return null;

  // Fecha ISO simple o fecha-hora ISO con zona horaria.
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  ) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    parsed.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return parsed;
}

export async function GET(request: NextRequest) {
  const start = performance.now();
  const params = request.nextUrl.searchParams;

  const page = readInteger(params.get("page"), 1, 1_000_000);
  const limit = readInteger(params.get("limit"), 50, 100);

  if (page === null || limit === null) {
    return errorResponse(
      "page debe ser un entero positivo y limit debe estar entre 1 y 100."
    );
  }

  const statusInput = params.get("status");

  if (
    statusInput !== null &&
    !statuses.includes(statusInput as OrderStatus)
  ) {
    return errorResponse("El estado del pedido no es válido.");
  }

  const fromInput = params.get("from");
  const toInput = params.get("to");

  const from = readDate(fromInput);
  const to = readDate(toInput);

  if (fromInput !== null && from === null) {
    return errorResponse("La fecha from debe tener formato ISO válido.");
  }

  if (toInput !== null && to === null) {
    return errorResponse("La fecha to debe tener formato ISO válido.");
  }

  // Una fecha final sin hora incluye todo ese día UTC.
  const toExclusive =
    toInput && /^\d{4}-\d{2}-\d{2}$/.test(toInput) && to
      ? new Date(to.getTime() + 86_400_000)
      : null;

  if (
    from &&
    to &&
    from.getTime() > (toExclusive?.getTime() ?? to.getTime())
  ) {
    return errorResponse("from no puede ser posterior a to.");
  }

  const where: Prisma.OrderWhereInput = {};

  if (statusInput) {
    where.status = statusInput as OrderStatus;
  }

  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(toExclusive
        ? { lt: toExclusive }
        : to
          ? { lte: to }
          : {}),
    };
  }

  try {
    const dbStart = performance.now();

    const [groups, orders] = await Promise.all([
      prisma.order.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
        _sum: {
          totalCents: true,
          costCents: true,
        },
      }),
      prisma.order.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          number: true,
          createdAt: true,
          status: true,
          customerName: true,
          itemsCount: true,
          totalCents: true,
          costCents: true,
        },
      }),
    ]);

    const dbDuration = performance.now() - dbStart;

    const byStatus: Record<OrderStatus, number> = {
      PENDING: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };

    let totalOrders = 0;
    let revenueCents = 0;
    let costCents = 0;

    for (const group of groups) {
      const count = group._count._all;

      byStatus[group.status] = count;
      totalOrders += count;
      revenueCents += group._sum.totalCents ?? 0;
      costCents += group._sum.costCents ?? 0;
    }

    const totalPages = Math.ceil(totalOrders / limit);

    const data = orders.map((order) => {
      const marginCents = order.totalCents - order.costCents;

      return {
        id: order.id,
        number: formatOrderNumber(order.number),
        createdAt: order.createdAt.toISOString(),
        status: order.status,
        customerName: order.customerName,
        itemsCount: order.itemsCount,
        totalCents: order.totalCents,
        costCents: order.costCents,
        marginCents,
        marginPct: percentage(marginCents, order.totalCents),
      };
    });

    const durationMs = performance.now() - start;

    return NextResponse.json(
      {
        summary: {
          ...summarizeFinance({ revenueCents, costCents, orders: totalOrders }),
          byStatus,
        },
        data,
        pagination: {
          page,
          limit,
          total: totalOrders,
          totalPages,
          hasNext: page < totalPages,
        },
        meta: {
          durationMs: Math.round(durationMs * 100) / 100,
          generatedAt: new Date().toISOString(),
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "Server-Timing":
            `db;dur=${dbDuration.toFixed(2)}, ` +
            `total;dur=${durationMs.toFixed(2)}`,
        },
      }
    );
  } catch (error) {
    console.error("Analytics query failed:", error);

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "No se pudieron consultar las métricas.",
          details: {},
        },
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
