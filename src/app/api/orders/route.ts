
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/server/auth";
import { orderQuerySchema } from "@/lib/schemas/order";
import { listOrders } from "@/server/services/orders/list-orders";
import { createOrderSchema } from "@/lib/schemas/order";
import {
  createOrder,
  MissingProductsError,
} from "@/server/services/orders/create-order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await requireSession();

  if (!user) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHENTICATED",
          message: "Debes iniciar sesión para consultar pedidos.",
          details: {},
        },
      },
      { status: 401 }
    );
  }

  const parsed = orderQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Parámetros de búsqueda inválidos.",
          details: { issues: parsed.error.issues },
        },
      },
      { status: 400 }
    );
  }

  try {
    const result = await listOrders(parsed.data);

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("GET /api/orders failed:", error);

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "No fue posible consultar los pedidos.",
          details: {},
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await requireSession();

  if (!user) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHENTICATED",
          message: "Debes iniciar sesión para crear pedidos.",
          details: {},
        },
      },
      { status: 401 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "El cuerpo debe ser JSON válido.",
          details: {},
        },
      },
      { status: 400 }
    );
  }

  const parsed = createOrderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Datos de pedido inválidos.",
          details: { issues: parsed.error.issues },
        },
      },
      { status: 400 }
    );
  }

  try {
    const order = await createOrder(parsed.data, user.id);

    return NextResponse.json(order, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof MissingProductsError) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Uno o más productos no existen.",
            details: {},
          },
        },
        { status: 404 }
      );
    }

    console.error("POST /api/orders failed:", error);

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "No fue posible crear el pedido.",
          details: {},
        },
      },
      { status: 500 }
    );
  }
}
