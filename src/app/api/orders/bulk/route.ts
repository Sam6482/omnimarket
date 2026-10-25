import { NextRequest, NextResponse } from "next/server";
import { bulkUpdateSchema } from "@/lib/schemas/bulk";
import { requireSession } from "@/server/auth";
import {
  NO_STORE_HEADERS,
  errorResponse,
  internalErrorResponse,
  invalidJsonResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/server/http/errors";
import { bulkUpdateOrderStatus } from "@/server/services/orders/bulk-update";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/orders/bulk — cambio de estado en lote (docs/API.md, R8).
 * 200 { updated, unchanged } · 400 · 401 · 404 { details.missingIds } · 409 · 500. Todo o nada.
 */
export async function PATCH(request: NextRequest) {
  const user = await requireSession();
  if (!user) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  const input = bulkUpdateSchema.safeParse(body);
  if (!input.success) return validationErrorResponse(input.error);

  try {
    const result = await bulkUpdateOrderStatus({ input: input.data, actorId: user.id });
    if (!result.ok) return errorResponse(result.error.code, result.error.message, result.error.details);
    return NextResponse.json({ updated: result.updated, unchanged: result.unchanged }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("[orders/bulk] Falló la actualización masiva:", error);
    return internalErrorResponse("No se pudo actualizar los pedidos. No se aplicó ningún cambio.");
  }
}
