
import { expect, test } from "./fixtures";

test.describe("B1 · Actualización masiva de pedidos", () => {
test("permite cancelar y confirmar una actualización masiva", async ({
    page,
}) => {
    await page.goto("/orders");

    // Seleccionamos dos pedidos de la página actual.
    const checkboxes = page.locator(
    'input[data-testid^="bulk-select-"]:not([data-testid="bulk-select-all"])',
    );

    await expect(checkboxes.first()).toBeVisible();
    await expect(checkboxes.nth(1)).toBeVisible();

    const firstRow = checkboxes.nth(0).locator("xpath=ancestor::tr");
    const secondRow = checkboxes.nth(1).locator("xpath=ancestor::tr");

    const originalFirstStatus = await firstRow.locator("td").nth(3).innerText();
    const originalSecondStatus = await secondRow.locator("td").nth(3).innerText();

    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    await expect(page.getByTestId("bulk-selection-count")).toContainText(
    "2 pedido(s) seleccionado(s)",
    );

    // Elegimos un estado diferente al de los pedidos originales.
    const statusSelect = page.getByTestId("bulk-status-select");
    const options = await statusSelect.locator("option").evaluateAll((items) =>
    items.map((item) => ({
        value: (item as HTMLOptionElement).value,
        label: item.textContent?.trim() ?? "",
    })),
    );

    const target = options.find(
    (option) =>
        option.label !== originalFirstStatus &&
        option.label !== originalSecondStatus,
    );

    expect(target, "Debe existir un estado alternativo").toBeDefined();
    if (!target) return;

    await statusSelect.selectOption(target.value);
    await page.getByTestId("bulk-update-button").click();

    const dialog = page.getByRole("dialog", {
    name: "Confirmar actualización masiva",
    });

    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("2 pedido(s)");
    await expect(dialog).toContainText(target.label);

    // Cancelar no debe enviar ninguna actualización.
    let bulkRequests = 0;
    page.on("request", (request) => {
    if (
        request.method() === "PATCH" &&
        new URL(request.url()).pathname === "/api/orders/bulk"
    ) {
        bulkRequests += 1;
    }
    });

    await dialog.getByRole("button", { name: "Cancelar" }).click();

    await expect(dialog).not.toBeVisible();
    expect(bulkRequests).toBe(0);
    await expect(firstRow.locator("td").nth(3)).toHaveText(originalFirstStatus);
    await expect(secondRow.locator("td").nth(3)).toHaveText(originalSecondStatus);

    // Abrimos nuevamente el modal y confirmamos.
    await page.getByTestId("bulk-update-button").click();
    await expect(dialog).toBeVisible();

    const responsePromise = page.waitForResponse(
    (response) =>
        new URL(response.url()).pathname === "/api/orders/bulk" &&
        response.request().method() === "PATCH",
    );

    await dialog.getByTestId("bulk-confirm-button").click();

    const response = await responsePromise;
    expect(response.status()).toBe(200);

    const result = await response.json();
    expect(result.updated).toBe(2);

    await expect(dialog).not.toBeVisible();

    await expect(page.getByTestId("bulk-result-message")).toContainText(
    "2 actualizado(s)",
    );

    await expect(firstRow.locator("td").nth(3)).toHaveText(target.label);
    await expect(secondRow.locator("td").nth(3)).toHaveText(target.label);

    await expect(page.getByTestId("bulk-selection-count")).toHaveCount(0);
});
});
