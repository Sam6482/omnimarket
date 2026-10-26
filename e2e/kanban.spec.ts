import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/**
 * E2E 3 — Kanban (R5, R6, R11, R13).
 * Movimiento optimista, persistencia (auditoría + recarga) y reversión con toast ante un error 500.
 */

const CARD = '[data-testid^="kanban-card-"]';

/** Primera tarjeta de una columna: devuelve su id y su número OM-n. */
async function firstCard(page: Page, status: string) {
  const card = page.getByTestId(`kanban-column-${status}`).locator(CARD).first();
  await expect(card).toBeVisible();
  const id = ((await card.getAttribute("data-testid")) ?? "").replace("kanban-card-", "");
  const number = (await card.textContent())?.match(/OM-\d+/)?.[0] ?? "";
  expect(id, "La tarjeta debe tener id").not.toBe("");
  expect(number, "La tarjeta debe mostrar su número OM-n").not.toBe("");
  return { id, number };
}

async function auditStatus(page: Page, number: string) {
  const response = await page.request.get(`/api/test/kanban-status?number=${number}`);
  expect(response.status()).toBe(200);
  return ((await response.json()) as { order: { status: string } }).order.status;
}

test.describe("E2E 3 · Kanban", () => {
  test("mover una tarjeta la coloca al inicio de la columna y persiste", async ({ page }) => {
    await page.goto("/kanban");
    const { id, number } = await firstCard(page, "PENDING");

    const saved = page.waitForResponse(
      (response) => response.url().includes(`/api/orders/${id}/status`) && response.request().method() === "PATCH"
    );
    await page.getByTestId(`kanban-move-${id}`).selectOption("SHIPPED");
    expect((await saved).status()).toBe(200);

    await expect(page.getByTestId("toast-success").filter({ hasText: number })).toBeVisible();
    const shippedFirst = page.getByTestId("kanban-column-SHIPPED").locator(CARD).first();
    await expect(shippedFirst).toHaveAttribute("data-testid", `kanban-card-${id}`);

    // Auditoría (R5): el servidor confirma el nuevo estado.
    expect(await auditStatus(page, number)).toBe("SHIPPED");

    // Persistencia: tras recargar sigue al inicio de Enviados.
    await page.reload();
    await expect(page.getByTestId("kanban-column-SHIPPED").locator(CARD).first()).toHaveAttribute(
      "data-testid",
      `kanban-card-${id}`
    );
  });

  test("si el servidor falla, la tarjeta vuelve a su columna y aparece toast de error", async ({
    page,
    consoleErrors,
  }) => {
    await page.goto("/kanban");
    const { id, number } = await firstCard(page, "PROCESSING");

    // Error 500 simulado, con un retardo para observar el movimiento optimista.
    await page.route(`**/api/orders/${id}/status`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Fallo simulado", details: {} } }),
      });
    });

    await page.getByTestId(`kanban-move-${id}`).selectOption("DELIVERED");

    // Cambio visual inmediato (optimista).
    await expect(page.getByTestId("kanban-column-DELIVERED").getByTestId(`kanban-card-${id}`)).toBeVisible();

    // Reversión + toast de error.
    await expect(page.getByTestId("toast-error")).toBeVisible();
    await expect(page.getByTestId("kanban-column-PROCESSING").getByTestId(`kanban-card-${id}`)).toBeVisible();
    await expect(page.getByTestId("kanban-column-DELIVERED").getByTestId(`kanban-card-${id}`)).toHaveCount(0);

    // El servidor no cambió nada.
    expect(await auditStatus(page, number)).toBe("PROCESSING");

    // El navegador registra el 500 simulado como error de recurso: es esperado en esta prueba.
    for (let index = consoleErrors.length - 1; index >= 0; index -= 1) {
      if (/status of 500/.test(consoleErrors[index])) consoleErrors.splice(index, 1);
    }
  });
});
