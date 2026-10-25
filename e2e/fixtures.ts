import { test as base, expect } from "@playwright/test";

/**
 * `test` base de todos los E2E. Incluye un fixture automático que FALLA la prueba si la página
 * registra `console.error` o un error no controlado (R2: renderizado sin errores de consola).
 * Usar siempre: `import { test, expect } from "./fixtures";`
 */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("pageerror", (error) => errors.push(error.message));
      await use(errors);
      expect(errors, "La página no debe registrar errores en la consola (R2)").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
