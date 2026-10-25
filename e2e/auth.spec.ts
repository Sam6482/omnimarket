import { PrismaClient } from "@prisma/client";
import { expect, test } from "./fixtures";
import { loadE2EEnvironment } from "./support/env";
import { createTestSession, sessionCookie } from "./support/session";

/** E2E 1 — Autenticación (R9): protección de páginas privadas, acceso con sesión y cierre de sesión. */

const PRIVATE_PAGES = ["/", "/inventory", "/orders", "/kanban"] as const;

test.describe("E2E 1 · Autenticación", () => {
  test.describe("sin sesión", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    for (const pagePath of PRIVATE_PAGES) {
      test(`${pagePath} redirige a /login con los proveedores OAuth`, async ({ page }) => {
        await page.goto(pagePath);
        await expect(page).toHaveURL(/\/login\?callbackUrl=/);
        await expect(page.getByTestId("login-google")).toBeVisible();
        await expect(page.getByTestId("login-github")).toBeVisible();
      });
    }
  });

  test("con sesión accede a las cuatro páginas privadas", async ({ page }) => {
    for (const pagePath of PRIVATE_PAGES) {
      await page.goto(pagePath);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.getByTestId("logout-button")).toBeVisible();
    }
  });

  test("cerrar sesión invalida la sesión", async ({ page, baseURL }) => {
    // Sesión propia para no invalidar la compartida por las demás pruebas.
    const prisma = new PrismaClient({ datasourceUrl: loadE2EEnvironment().DATABASE_URL });
    const { sessionToken, expires } = await createTestSession(prisma);
    await prisma.$disconnect();

    await page.context().clearCookies();
    await page.context().addCookies([sessionCookie(sessionToken, expires, baseURL as string)]);

    await page.goto("/kanban");
    await page.getByTestId("logout-button").click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/kanban");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fkanban/);
  });
});
