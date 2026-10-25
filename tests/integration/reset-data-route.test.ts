import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const resetDomainData = vi.hoisted(() => vi.fn());
vi.mock("@/server/services/reset-data", () => ({ resetDomainData }));

import { POST } from "@/app/api/test/reset-data/route";

/** Petición mínima: la ruta solo lee encabezados (no hay body). */
function request(headers: Record<string, string> = {}) {
  const all: Record<string, string> = { host: "localhost:3100", ...headers };
  return {
    headers: { get: (name: string) => all[name.toLowerCase()] ?? null },
  } as unknown as Parameters<typeof POST>[0];
}

const success = { ok: true, seed: 42, counts: { products: 40, orders: 1200, orderItems: 3100 }, durationMs: 850 };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("RESET_DATA_ENABLED", "true");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/test/reset-data", () => {
  it("devuelve 200 con el resultado y sin caché", async () => {
    resetDomainData.mockResolvedValue(success);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(success);
  });

  it("responde 403 y no toca la base si RESET_DATA_ENABLED no está activado", async () => {
    vi.stubEnv("RESET_DATA_ENABLED", "");

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("FORBIDDEN");
    expect(resetDomainData).not.toHaveBeenCalled();
  });

  it("responde 403 a una petición de navegador desde otro sitio (CSRF)", async () => {
    const response = await POST(request({ origin: "https://sitio-malicioso.example", "sec-fetch-site": "cross-site" }));

    expect(response.status).toBe(403);
    expect(resetDomainData).not.toHaveBeenCalled();
  });

  it("responde 409 CONFLICT si ya hay un reset en curso", async () => {
    resetDomainData.mockResolvedValue({ ok: false, code: "RESET_IN_PROGRESS" });

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("CONFLICT");
  });

  it("devuelve 500 INTERNAL_ERROR sin filtrar detalles internos", async () => {
    resetDomainData.mockRejectedValue(new Error("password authentication failed for user secreto"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(body)).not.toContain("secreto");
  });
});
