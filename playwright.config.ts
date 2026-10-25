import { randomBytes } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";
import { loadE2EEnvironment } from "./e2e/support/env";
import { STORAGE_STATE_PATH } from "./e2e/support/session";

/**
 * E2E con Playwright (R13). Ver e2e/README.md.
 * - Base de PRUEBA obligatoria (.env.e2e.local o E2E_DATABASE_URL); production está bloqueada.
 * - Levanta su propio servidor en el puerto 3200 (nunca reutiliza uno existente).
 * - globalSetup restablece el dataset y crea una sesión de prueba (sin login falso).
 */

const e2eEnv = loadE2EEnvironment();
const PORT = 3200;
const baseURL = `http://localhost:${PORT}`;
const nextBin = "node ./node_modules/next/dist/bin/next";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1, // una sola base compartida: pruebas en serie y deterministas
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL,
    storageState: STORAGE_STATE_PATH,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.CI ? `${nextBin} build && ${nextBin} start --port ${PORT}` : `${nextBin} dev --port ${PORT}`,
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      ...e2eEnv,
      RESET_DATA_ENABLED: "true",
      AUTH_SECRET: process.env.AUTH_SECRET ?? randomBytes(32).toString("base64"),
      AUTH_TRUST_HOST: "true",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
