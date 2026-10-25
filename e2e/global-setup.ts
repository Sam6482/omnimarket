import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FullConfig } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { loadE2EEnvironment } from "./support/env";
import { STORAGE_STATE_PATH, createTestSession, sessionCookie } from "./support/session";

/**
 * Antes de los E2E (el servidor de Playwright ya está arriba):
 *  1. Restablece el dataset determinista con POST /api/test/reset-data (40 / 1,200 / 3,100).
 *  2. Crea una sesión de prueba y la guarda como storageState para las pruebas con login.
 */
export default async function globalSetup(config: FullConfig) {
  const env = loadE2EEnvironment();
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) throw new Error("[e2e] Falta baseURL en playwright.config.ts");

  const reset = await fetch(`${baseURL}/api/test/reset-data`, { method: "POST" });
  if (!reset.ok) {
    throw new Error(`[e2e] reset-data respondió ${reset.status}: ${await reset.text()}`);
  }

  const prisma = new PrismaClient({ datasourceUrl: env.DATABASE_URL });
  try {
    const { sessionToken, expires } = await createTestSession(prisma);
    await mkdir(path.dirname(STORAGE_STATE_PATH), { recursive: true });
    await writeFile(
      STORAGE_STATE_PATH,
      JSON.stringify({ cookies: [sessionCookie(sessionToken, expires, baseURL)], origins: [] }, null, 2)
    );
  } finally {
    await prisma.$disconnect();
  }
}
