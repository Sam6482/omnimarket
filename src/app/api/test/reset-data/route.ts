import { NextRequest, NextResponse } from "next/server";
import { evaluateResetRequest, RESET_ENABLED_ENV } from "@/server/http/reset-guard";
import { resetDomainData } from "@/server/services/reset-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** El reset inserta ~4,300 filas en una transacción; se da margen en Vercel. */
export const maxDuration = 60;

const headers = { "Cache-Control": "no-store" };

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message, details: {} } }, { status, headers });
}

/**
 * POST /api/test/reset-data — público por decisión (ADR-0001) para la auditoría docente.
 * Sin body. Restaura el dataset determinista (semilla 42) solo en tablas de dominio.
 * Requiere RESET_DATA_ENABLED=true en el entorno y rechaza peticiones de otros sitios web.
 * Solo exporta POST: un GET (enlace, buscador, prefetch) recibe 405 y nunca borra datos.
 */
export async function POST(request: NextRequest) {
  const guard = evaluateResetRequest({
    enabledFlag: process.env[RESET_ENABLED_ENV],
    origin: request.headers.get("origin"),
    host: request.headers.get("host"),
    secFetchSite: request.headers.get("sec-fetch-site"),
  });
  if (!guard.allowed) return errorResponse(403, guard.code, guard.message);

  try {
    const result = await resetDomainData();
    if (!result.ok) {
      return errorResponse(409, "CONFLICT", "Ya hay un restablecimiento en curso. Inténtalo en unos segundos.");
    }
    return NextResponse.json(result, { headers });
  } catch (error) {
    // Detalle solo en el log del servidor; al cliente no se le filtran datos internos.
    console.error("[reset-data] Falló la restauración del dataset:", error);
    return errorResponse(500, "INTERNAL_ERROR", "No se pudo restablecer la base de datos. No se aplicó ningún cambio.");
  }
}
