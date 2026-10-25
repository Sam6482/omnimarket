import { describe, expect, it } from "vitest";
import { requireSession } from "@/server/auth";
import { API_ERROR_STATUS, unauthorizedResponse } from "@/server/http/errors";

describe("contrato de autenticación (temporal, seguro por defecto)", () => {
  it("requireSession devuelve null mientras no esté integrado OAuth", async () => {
    await expect(requireSession()).resolves.toBeNull();
  });

  it("unauthorizedResponse responde 401 UNAUTHENTICATED sin caché", async () => {
    const response = unauthorizedResponse();
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect((await response.json()).error.code).toBe("UNAUTHENTICATED");
  });

  it("asigna el código HTTP del contrato a cada error", () => {
    expect(API_ERROR_STATUS).toEqual({
      VALIDATION_ERROR: 400,
      UNAUTHENTICATED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      CONFLICT: 409,
      INTERNAL_ERROR: 500,
    });
  });
});
