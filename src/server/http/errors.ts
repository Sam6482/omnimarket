import { NextResponse } from "next/server";
import type { z } from "zod";

/**
 * Respuestas de error con el formato único de docs/API.md:
 *   { "error": { "code": string, "message": string, "details": unknown } }
 * Todas incluyen `Cache-Control: no-store`.
 */

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export const API_ERROR_STATUS: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

export const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

export function errorResponse(code: ApiErrorCode, message: string, details: unknown = {}) {
  return NextResponse.json(
    { error: { code, message, details } },
    { status: API_ERROR_STATUS[code], headers: NO_STORE_HEADERS }
  );
}

/** 401 — ruta privada sin sesión. */
export function unauthorizedResponse() {
  return errorResponse("UNAUTHENTICATED", "Debes iniciar sesión para realizar esta acción.");
}

/** 400 — entrada inválida según un esquema Zod; `details.issues` indica campo y motivo. */
export function validationErrorResponse(error: z.ZodError, message = "Los datos enviados no son válidos.") {
  return errorResponse("VALIDATION_ERROR", message, {
    issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
  });
}

/** 400 — el cuerpo no es JSON válido. */
export function invalidJsonResponse() {
  return errorResponse("VALIDATION_ERROR", "El cuerpo de la petición debe ser JSON válido.");
}

/** 404 — recurso inexistente. */
export function notFoundResponse(message = "El recurso no existe.", details: unknown = {}) {
  return errorResponse("NOT_FOUND", message, details);
}

/** 409 — duplicado o conflicto de versión. */
export function conflictResponse(message: string, details: unknown = {}) {
  return errorResponse("CONFLICT", message, details);
}

/** 500 — error no controlado. Nunca incluir detalles internos (registrar en el servidor). */
export function internalErrorResponse(message = "Ocurrió un error inesperado. Inténtalo de nuevo.") {
  return errorResponse("INTERNAL_ERROR", message);
}
