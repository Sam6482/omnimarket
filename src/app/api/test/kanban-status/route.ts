
import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { formatOrderNumber } from "@/lib/order-number";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statuses = Object.values(OrderStatus);

const headers = {
  "Cache-Control": "no-store",
};

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details: {},
      },
    },
    { status, headers }
  );
}

const orderSelect = {
  id: true,
  number: true,
  status: true,
  position: true,
  updatedAt: true,
} satisfies Prisma.OrderSelect;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const orderId = params.get("orderId");
  const number = params.get("number");

  if (orderId !== null && number !== null) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "Envía orderId o number, pero no ambos."
    );
  }

  if (orderId !== null && orderId.trim() === "") {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "orderId no puede estar vacío."
    );
  }

  if (number !== null && !/^OM-[1-9]\d*$/.test(number)) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "number debe tener el formato OM-1042."
    );
  }

  try {
    // Consulta de un pedido específico.
    if (orderId !== null || number !== null) {
      const parsedNumber =
        number === null ? null : Number(number.slice(3));

      if (
        parsedNumber !== null &&
        !Number.isSafeInteger(parsedNumber)
      ) {
        return errorResponse(
          400,
          "VALIDATION_ERROR",
          "El número del pedido no es válido."
        );
      }

      const order = await prisma.order.findUnique({
        where:
          orderId !== null
            ? { id: orderId }
            : { number: parsedNumber! },
        select: orderSelect,
      });

      if (!order) {
        return errorResponse(
          404,
          "NOT_FOUND",
          "No se encontró el pedido."
        );
      }

      return NextResponse.json(
        {
          order: {
            ...order,
            number: formatOrderNumber(order.number),
            updatedAt: order.updatedAt.toISOString(),
          },
        },
        { headers }
      );
    }

    // Vista general: métricas completas por columna y
    // máximo 50 pedidos de cada estado.
    const [groups, ...ordersByStatus] = await Promise.all([
      prisma.order.groupBy({
        by: ["status"],
        _count: { _all: true },
        _sum: { totalCents: true },
      }),
      ...statuses.map((status) =>
        prisma.order.findMany({
          where: { status },
          orderBy: [{ position: "asc" }, { id: "asc" }],
          take: 50,
          select: orderSelect,
        })
      ),
    ]);

    const columns = statuses.map((status, index) => {
      const summary = groups.find(
        (group) => group.status === status
      );

      return {
        status,
        count: summary?._count._all ?? 0,
        totalCents: summary?._sum.totalCents ?? 0,
        orders: ordersByStatus[index].map((order) => ({
          id: order.id,
          number: formatOrderNumber(order.number),
          position: order.position,
          updatedAt: order.updatedAt.toISOString(),
        })),
      };
    });

    return NextResponse.json(
      {
        columns,
        generatedAt: new Date().toISOString(),
      },
      { headers }
    );
  } catch (error) {
    console.error("Kanban status query failed:", error);

    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "No se pudo consultar el estado del Kanban."
    );
  }
}
