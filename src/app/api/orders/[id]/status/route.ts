import { NextRequest, NextResponse } from "next/server";
import { orderIdParamSchema, updateOrderStatusSchema } from "@/lib/schemas/order-status";
import { requireSession } from "@/server/auth";
import {
  NO_STORE_HEADERS,
  errorResponse,
  internalErrorResponse,
  invalidJsonResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/server/http/errors";
import { updateOrderStatus } from "@/server/services/orders/update-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/orders/:id/status — movimiento de Kanban (docs/API.md).
 * Privada: autenticar → validar con Zod → servicio → responder (CLAUDE.md, regla 1).
 * 200 { id, status, position, updatedAt } · 400 · 401 · 404 · 409 (First Writer Wins) · 500.
 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireSession();
  if (!user) return unauthorizedResponse();

  const { id } = await context.params;
  const orderId = orderIdParamSchema.safeParse(id);
  if (!orderId.success) return validationErrorResponse(orderId.error);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  const input = updateOrderStatusSchema.safeParse(body);
  if (!input.success) return validationErrorResponse(input.error);

  try {
    const result = await updateOrderStatus({ orderId: orderId.data, input: input.data, actorId: user.id });
    if (!result.ok) {
      return errorResponse(result.error.code, result.error.message, result.error.details);
    }
    return NextResponse.json(
      { ...result.order, updatedAt: result.order.updatedAt.toISOString() },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("[orders/status] Falló la actualización del pedido:", error);
    return internalErrorResponse("No se pudo actualizar el pedido. No se aplicó ningún cambio.");
  }
}
