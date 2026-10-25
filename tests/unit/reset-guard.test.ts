import { describe, expect, it } from "vitest";
import { evaluateResetRequest } from "@/server/http/reset-guard";

const base = { enabledFlag: "true", origin: null, host: "omnimarket.vercel.app", secFetchSite: null };

describe("evaluateResetRequest", () => {
  it("permite curl/Postman/Playwright (sin Origin) cuando el entorno lo habilita", () => {
    expect(evaluateResetRequest(base)).toEqual({ allowed: true });
  });

  it("permite peticiones del mismo origen (la propia app)", () => {
    const result = evaluateResetRequest({ ...base, origin: "https://omnimarket.vercel.app", secFetchSite: "same-origin" });
    expect(result.allowed).toBe(true);
  });

  it("bloquea si RESET_DATA_ENABLED no es exactamente 'true'", () => {
    for (const enabledFlag of [undefined, "", "false", "TRUE", "1"]) {
      expect(evaluateResetRequest({ ...base, enabledFlag }).allowed).toBe(false);
    }
  });

  it("bloquea orígenes distintos, inválidos u opacos", () => {
    for (const origin of ["https://evil.example", "no-es-url", "null"]) {
      expect(evaluateResetRequest({ ...base, origin }).allowed).toBe(false);
    }
    expect(evaluateResetRequest({ ...base, secFetchSite: "cross-site" }).allowed).toBe(false);
  });
});
