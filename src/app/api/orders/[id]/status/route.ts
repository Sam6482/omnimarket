
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function PATCH() {
  return NextResponse.json(
    {
      error: {
        code: "UNAUTHENTICATED",
        message: "Debes iniciar sesión para modificar un pedido.",
        details: {},
      },
    },
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
