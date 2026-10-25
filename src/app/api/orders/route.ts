
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/server/auth";
import { orderQuerySchema } from "@/lib/schemas/order";
import { listOrders } from "@/server/services/orders/list-orders";

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
