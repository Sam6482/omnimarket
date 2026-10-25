import { describe, expect, it } from "vitest";
import { isOAuthProvider, loginErrorMessage, safeCallbackUrl } from "@/lib/auth-redirect";

describe("safeCallbackUrl", () => {
  it("permite rutas internas", () => {
    expect(safeCallbackUrl("/kanban")).toBe("/kanban");
    expect(safeCallbackUrl("/orders?status=PENDING")).toBe("/orders?status=PENDING");
  });

  it("bloquea redirecciones abiertas y valores inválidos", () => {
    for (const value of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "", null, 42]) {
      expect(safeCallbackUrl(value)).toBe("/");
    }
  });
});

describe("isOAuthProvider", () => {
  it("solo acepta google y github", () => {
    expect(isOAuthProvider("google")).toBe(true);
    expect(isOAuthProvider("github")).toBe(true);
    expect(isOAuthProvider("credentials")).toBe(false);
    expect(isOAuthProvider(undefined)).toBe(false);
  });
});

describe("loginErrorMessage", () => {
  it("traduce los errores de Auth.js y no muestra nada sin error", () => {
    expect(loginErrorMessage(undefined)).toBeNull();
    expect(loginErrorMessage("AccessDenied")).toContain("Acceso denegado");
    expect(loginErrorMessage("OAuthAccountNotLinked")).toContain("otro proveedor");
    expect(loginErrorMessage("Rara")).toBe("No se pudo iniciar sesión. Inténtalo de nuevo.");
  });
});
