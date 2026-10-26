import { formatCurrency } from "../src/lib/format";
import { expect, test } from "./fixtures";

/**
 * E2E 2 — CRUD (R7, R13).
 * Crea, edita y elimina SOLO datos propios de la prueba (SKU y correo únicos por ejecución).
 * El pedido usa un producto existente del dataset para poder eliminar después el producto de prueba.
 */

const runId = Date.now().toString(36).toUpperCase();

test.describe("E2E 2 · CRUD de productos y pedidos", () => {
  test("crea, edita y elimina un producto en inventario", async ({ page }) => {
    const sku = `E2E-${runId}`;
    const name = `Producto E2E ${runId}`;

    await page.goto("/inventory");
    await page.getByTestId("inventory-create-product").click();

    const form = page.getByTestId("product-create-form");
    await form.getByTestId("product-field-sku").fill(sku);
    await form.getByTestId("product-field-name").fill(name);
    await form.getByTestId("product-field-category").fill("Pruebas E2E");
    await form.getByTestId("product-field-price").fill("199.90");
    await form.getByTestId("product-field-cost").fill("120.50");
    await form.getByTestId("product-field-stock").fill("7");

    const createResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/products" && response.request().method() === "POST"
    );
    await page.getByTestId("product-submit").click();
    expect((await createResponse).status()).toBe(201);
    await expect(page.getByTestId("toast-success").filter({ hasText: "Producto creado" })).toBeVisible();

    // Aparece en el inventario. El id se toma de la fila (no del cuerpo de la respuesta del navegador,
    // que puede quedar inaccesible tras router.refresh y bloquear `response.json()`).
    await page.getByTestId("inventory-search").fill(sku);
    await page.getByTestId("inventory-search").press("Enter");
    const row = page.locator('[data-testid^="inventory-row-"]').filter({ hasText: sku });
    await expect(row).toHaveCount(1);
    const productId = ((await row.getAttribute("data-testid")) ?? "").replace("inventory-row-", "");
    const product = { id: productId };
    await expect(row).toContainText(sku);
    await expect(row).toContainText(name);
    await expect(row).toContainText(formatCurrency(19990));

    // Editar nombre y precio.
    await page.getByTestId(`product-edit-${product.id}`).click();
    const editForm = page.getByTestId(`product-edit-form-${product.id}`);
    await editForm.getByLabel("Nombre").fill(`${name} editado`);
    await editForm.getByLabel("Precio MXN").fill("249.00");
    await editForm.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(page.getByTestId("toast-success").filter({ hasText: "Producto actualizado" })).toBeVisible();
    await expect(row).toContainText(`${name} editado`);
    await expect(row).toContainText(formatCurrency(24900));

    // Eliminar solo el producto de prueba.
    await page.getByTestId(`product-delete-${product.id}`).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Sí, eliminar" }).click();
    await expect(page.getByTestId("toast-success").filter({ hasText: "Producto eliminado" })).toBeVisible();
    await expect(row).toHaveCount(0);
  });

  test("crea un pedido con el total correcto, lo edita y lo elimina", async ({ page }) => {
    const customer = `Cliente E2E ${runId}`;
    const quantity = 3;

    await page.goto("/orders");
    await page.getByTestId("orders-create-button").click();

    const form = page.getByTestId("order-create-form");
    await form.getByLabel("Nombre del cliente").fill(customer);
    await form.getByLabel("Correo electrónico").fill(`e2e.${runId.toLowerCase()}@example.com`);

    // Primer producto disponible del catálogo (el servidor calcula el total con su precio).
    const productSelect = form.getByLabel("Producto");
    await expect(productSelect.locator("option").nth(1)).toBeAttached();
    const productId = await productSelect.locator("option").nth(1).getAttribute("value");
    expect(productId).toBeTruthy();
    await productSelect.selectOption(productId as string);
    await form.getByLabel("Cantidad").fill(String(quantity));

    const catalog = await page.request.get("/api/products?page=1&limit=100");
    const { data } = (await catalog.json()) as { data: Array<{ id: string; priceCents: number }> };
    const priceCents = data.find((product) => product.id === productId)?.priceCents;
    expect(priceCents, "El producto elegido debe existir en el catálogo").toBeDefined();
    const expectedTotal = (priceCents as number) * quantity;

    // El formulario muestra el total estimado.
    await expect(form).toContainText(formatCurrency(expectedTotal));

    const createResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/orders" && response.request().method() === "POST"
    );
    await page.getByTestId("order-submit").click();
    expect((await createResponse).status()).toBe(201);

    // El servidor guardó el total calculado (consulta directa a la API, con la misma sesión).
    const lookup = await page.request.get(`/api/orders?q=${encodeURIComponent(customer)}`);
    expect(lookup.ok()).toBeTruthy();
    const { data: found } = (await lookup.json()) as {
      data: Array<{ id: string; totalCents: number; itemsCount: number }>;
    };
    expect(found).toHaveLength(1);
    const order = found[0];
    expect(order.totalCents).toBe(expectedTotal);
    expect(order.itemsCount).toBe(quantity);
    await expect(page.getByTestId("toast-success").filter({ hasText: "Pedido creado" })).toBeVisible();

    // Aparece en la tabla (orden por fecha descendente) con su total.
    const row = page.getByTestId(`order-row-${order.id}`);
    await expect(row).toContainText(customer);
    await expect(row).toContainText(formatCurrency(expectedTotal));

    // Editar solo el cliente: el total histórico se conserva.
    await page.getByTestId(`order-edit-${order.id}`).click();
    const editForm = page.getByTestId(`order-edit-form-${order.id}`);
    await editForm.getByLabel("Cliente").fill(`${customer} editado`);
    await editForm.getByRole("button", { name: "Guardar pedido" }).click();

    await expect(page.getByTestId("toast-success").filter({ hasText: "Pedido actualizado" })).toBeVisible();
    await expect(row).toContainText(`${customer} editado`);
    await expect(row).toContainText(formatCurrency(expectedTotal));

    // Eliminar solo el pedido de prueba (la app pide confirmación nativa).
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByTestId(`order-delete-${order.id}`).click();
    await expect(page.getByTestId("toast-success").filter({ hasText: "Pedido eliminado" })).toBeVisible();
    await expect(row).toHaveCount(0);
  });
});
