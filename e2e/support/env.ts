import { existsSync } from "node:fs";
import { config } from "dotenv";

/**
 * Conexión de la base de PRUEBA para los E2E (nunca production).
 *
 * Origen, en este orden:
 *  1. Variables E2E_DATABASE_URL / E2E_DIRECT_URL (CI con Postgres de servicio).
 *  2. Archivo .env.e2e.local (ignorado por Git) con DATABASE_URL / DIRECT_URL de una rama
 *     de Neon exclusiva para E2E (p. ej. `dev-e2e`).
 *
 * Los E2E restablecen datos con reset-data: por eso se detienen si la base es production.
 */

export const E2E_ENV_FILE = ".env.e2e.local";

/** Endpoints de Neon que JAMÁS deben usarse en E2E. */
const BLOCKED_ENDPOINTS = ["ep-proud-violet-b7qazjj9"]; // Neon branch: production

export type E2EEnvironment = { DATABASE_URL: string; DIRECT_URL: string };

function assertSafe(name: string, value: string): void {
  let host: string;
  try {
    host = new URL(value).hostname;
  } catch {
    throw new Error(`[e2e] ${name} no es una URL válida.`);
  }
  if (BLOCKED_ENDPOINTS.some((endpoint) => host.startsWith(endpoint))) {
    throw new Error(`[e2e] DETENIDO: ${name} apunta a la base de PRODUCTION. Usa una base de prueba.`);
  }
}

export function loadE2EEnvironment(): E2EEnvironment {
  const fileValues: Record<string, string> = {};
  if (existsSync(E2E_ENV_FILE)) config({ path: E2E_ENV_FILE, processEnv: fileValues, quiet: true });

  const DATABASE_URL = process.env.E2E_DATABASE_URL ?? fileValues.DATABASE_URL;
  const DIRECT_URL = process.env.E2E_DIRECT_URL ?? fileValues.DIRECT_URL ?? DATABASE_URL;

  if (!DATABASE_URL || !DIRECT_URL) {
    throw new Error(
      `[e2e] Falta la base de prueba: crea ${E2E_ENV_FILE} con DATABASE_URL y DIRECT_URL ` +
        "(rama de Neon exclusiva para E2E) o define E2E_DATABASE_URL. Ver e2e/README.md."
    );
  }

  assertSafe("DATABASE_URL", DATABASE_URL);
  assertSafe("DIRECT_URL", DIRECT_URL);
  return { DATABASE_URL, DIRECT_URL };
}
