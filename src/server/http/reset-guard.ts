/**
 * Protección del endpoint público POST /api/test/reset-data (independiente del script local).
 *
 * 1. Opt-in explícito: solo funciona si RESET_DATA_ENABLED === "true" en ese entorno.
 *    Un `pnpm dev` normal (sin la variable) responde 403 aunque apunte a una base real.
 *    En Vercel producción y en el CI de E2E la variable se activa a propósito (evaluación).
 * 2. Anti-CSRF: rechaza peticiones de navegador hechas desde otro sitio web.
 *    curl, Postman, Playwright y la propia app (mismo origen) siguen funcionando.
 */

export const RESET_ENABLED_ENV = "RESET_DATA_ENABLED";

export type ResetGuardInput = {
  enabledFlag: string | undefined;
  origin: string | null;
  host: string | null;
  secFetchSite: string | null;
};

export type ResetGuardResult =
  | { allowed: true }
  | { allowed: false; code: "FORBIDDEN"; message: string };

export function evaluateResetRequest({ enabledFlag, origin, host, secFetchSite }: ResetGuardInput): ResetGuardResult {
  if (enabledFlag !== "true") {
    return {
      allowed: false,
      code: "FORBIDDEN",
      message: `El reset de datos está deshabilitado en este entorno (${RESET_ENABLED_ENV}).`,
    };
  }

  if (secFetchSite === "cross-site") {
    return { allowed: false, code: "FORBIDDEN", message: "Origen no permitido." };
  }

  if (origin !== null && origin !== "null") {
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      return { allowed: false, code: "FORBIDDEN", message: "Origen no permitido." };
    }
    if (!host || originHost !== host) {
      return { allowed: false, code: "FORBIDDEN", message: "Origen no permitido." };
    }
  } else if (origin === "null") {
    return { allowed: false, code: "FORBIDDEN", message: "Origen no permitido." };
  }

  return { allowed: true };
}
