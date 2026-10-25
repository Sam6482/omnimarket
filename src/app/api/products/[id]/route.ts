
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/server/auth";
import { updateProductSchema } from "@/lib/schemas/product";
import {
  deleteProduct,
  updateProduct,
} from "@/server/services/products/manage-product";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

function apiError(
  status: number,
  code: string,
  message: string
) {
  return NextResponse.json(
    { error: { code, message, details: {} } },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

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

  if (!id?.trim()) {
    return apiError(400, "VALIDATION_ERROR", "ID inválido.");
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError(
      400,
      "VALIDATION_ERROR",
      "El cuerpo debe ser JSON válido."
    );
  }

  const parsed = updateProductSchema.safeParse(body);

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

  if (Object.keys(parsed.data).length === 0) {
    return apiError(
      400,
      "VALIDATION_ERROR",
      "Debes enviar al menos un campo."
    );
  }

  try {
    const product = await updateProduct(id, parsed.data);
    return NextResponse.json(product, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2025") {
        return apiError(404, "NOT_FOUND", "Producto inexistente.");
      }

      if (error.code === "P2002") {
        return apiError(409, "CONFLICT", "El SKU ya existe.");
      }
    }

    console.error("PATCH product failed:", error);
    return apiError(
      500,
      "INTERNAL_ERROR",
      "No fue posible actualizar el producto."
    );
  }
}

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

  if (!id?.trim()) {
    return apiError(400, "VALIDATION_ERROR", "ID inválido.");
  }

  try {
    const result = await deleteProduct(id);

    if (result === "NOT_FOUND") {
      return apiError(404, "NOT_FOUND", "Producto inexistente.");
    }

    if (result === "CONFLICT") {
      return apiError(
        409,
        "CONFLICT",
        "No se puede eliminar un producto asociado a pedidos."
      );
    }

    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2003") {
        return apiError(
          409,
          "CONFLICT",
          "El producto tiene pedidos asociados."
        );
      }

      if (error.code === "P2025") {
        return apiError(404, "NOT_FOUND", "Producto inexistente.");
      }
    }

    console.error("DELETE product failed:", error);
    return apiError(
      500,
      "INTERNAL_ERROR",
      "No fue posible eliminar el producto."
    );
  }
}
