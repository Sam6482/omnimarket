
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/server/auth";
import { updateOrderSchema } from "@/lib/schemas/order";
import {
  deleteOrder,
  getOrder,
  updateOrder,
  MissingOrderProductsError,
} from "@/server/services/orders/manage-orders";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

function apiError(
  status: number,
  code: string,
  message: string,
  details: Record<string, unknown> = {}
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
      },
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

/**
 * GET /api/orders/:id
 * Consultar un pedido con sus artículos.
 */
export async function GET(
  _request: NextRequest,
  context: Context
) {
  const user = await requireSession();

  if (!user) {
    return apiError(
      401,
      "UNAUTHENTICATED",
      "Debes iniciar sesión."
    );
  }

  const { id } = await context.params;

  if (!id.trim()) {
    return apiError(
      400,
      "VALIDATION_ERROR",
      "ID inválido."
    );
  }

  try {
    const order = await getOrder(id);

    if (!order) {
      return apiError(
        404,
        "NOT_FOUND",
        "Pedido inexistente."
      );
    }

    return NextResponse.json(order, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET order failed:", error);

    return apiError(
      500,
      "INTERNAL_ERROR",
      "Error al consultar el pedido."
    );
  }
}

/**
 * PATCH /api/orders/:id
 * Editar cliente y/o artículos del pedido.
 *
 * Los importes se recalculan en el servicio
 * utilizando los precios registrados en PostgreSQL.
 */
export async function PATCH(
  request: NextRequest,
  context: Context
) {
  const user = await requireSession();

  if (!user) {
    return apiError(
      401,
      "UNAUTHENTICATED",
      "Debes iniciar sesión."
    );
  }

  const { id } = await context.params;

  if (!id.trim()) {
    return apiError(
      400,
      "VALIDATION_ERROR",
      "ID inválido."
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError(
      400,
      "VALIDATION_ERROR",
      "JSON inválido."
    );
  }

  const parsed = updateOrderSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      400,
      "VALIDATION_ERROR",
      "Datos del pedido inválidos.",
      {
        issues: parsed.error.issues,
      }
    );
  }

  try {
    const order = await updateOrder(id, parsed.data);

    return NextResponse.json(order, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    // El pedido ya no existe.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return apiError(
        404,
        "NOT_FOUND",
        "Pedido inexistente."
      );
    }

    // Alguno de los productos seleccionados no existe.
    if (error instanceof MissingOrderProductsError) {
      return apiError(
        404,
        "NOT_FOUND",
        error.message
      );
    }

    // Conflicto de transacción concurrente.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return apiError(
        409,
        "CONFLICT",
        "El pedido fue modificado simultáneamente. Intenta de nuevo."
      );
    }

    console.error("PATCH order failed:", error);

    return apiError(
      500,
      "INTERNAL_ERROR",
      "Error al editar el pedido."
    );
  }
}

/**
 * DELETE /api/orders/:id
 * Eliminar un pedido.
 */
export async function DELETE(
  _request: NextRequest,
  context: Context
) {
  const user = await requireSession();

  if (!user) {
    return apiError(
      401,
      "UNAUTHENTICATED",
      "Debes iniciar sesión."
    );
  }

  const { id } = await context.params;

  if (!id.trim()) {
    return apiError(
      400,
      "VALIDATION_ERROR",
      "ID inválido."
    );
  }

  try {
    await deleteOrder(id);

    return new NextResponse(null, {
      status: 204,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return apiError(
        404,
        "NOT_FOUND",
        "Pedido inexistente."
      );
    }

    console.error("DELETE order failed:", error);

    return apiError(
      500,
      "INTERNAL_ERROR",
      "Error al eliminar el pedido."
    );
  }
}
