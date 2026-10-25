
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/server/auth";
import { listProducts } from "@/server/services/products/list-products";
import { productQuerySchema } from "@/lib/schemas/product";
import { Prisma } from "@prisma/client";
import { createProductSchema } from "@/lib/schemas/product";
import { createProduct } from "@/server/services/products/create-product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Las rutas privadas requieren una sesión válida.
  const user = await requireSession();

  if (!user) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHENTICATED",
          message: "Debes iniciar sesión para consultar productos.",
          details: {},
        },
      },
      { status: 401 }
    );
  }

  const params = Object.fromEntries(
    request.nextUrl.searchParams.entries()
  );

  const parsed = productQuerySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Los parámetros de búsqueda no son válidos.",
          details: parsed.error.flatten(),
        },
      },
      { status: 400 }
    );
  }

  try {
    const result = await listProducts(parsed.data);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/products failed:", error);

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "No fue posible consultar los productos.",
          details: {},
        },
      },
      { status: 500 }
    );
  }
}


export async function POST(request: NextRequest) {
  // Protección: no se puede crear sin una sesión válida.
  const user = await requireSession();

  if (!user) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHENTICATED",
          message: "Debes iniciar sesión para crear productos.",
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
          message: "El cuerpo debe contener JSON válido.",
          details: {},
        },
      },
      { status: 400 }
    );
  }

  const parsed = createProductSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Los datos del producto no son válidos.",
          details: parsed.error.flatten(),
        },
      },
      { status: 400 }
    );
  }

  try {
    const product = await createProduct(parsed.data);

    return NextResponse.json(product, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "Ya existe un producto con ese SKU.",
            details: {},
          },
        },
        { status: 409 }
      );
    }

    console.error("POST /api/products failed:", error);

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "No fue posible crear el producto.",
          details: {},
        },
      },
      { status: 500 }
    );
  }
}
