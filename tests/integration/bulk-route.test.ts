import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireSession: vi.fn(), bulkUpdateOrderStatus: vi.fn() }));
vi.mock("@/server/auth", () => ({ requireSession: mocks.requireSession }));
vi.mock("@/server/services/orders/bulk-update", () => ({ bulkUpdateOrderStatus: mocks.bulkUpdateOrderStatus }));

import { PATCH } from "@/app/api/orders/bulk/route";

function call(body: unknown, rawBody?: string) {
  return PATCH({ json: async () => (rawBody !== undefined ? JSON.parse(rawBody) : body) } as unknown as Parameters<typeof PATCH>[0]);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireSession.mockResolvedValue({ id: "user-1", email: null, name: null });
});

describe("PATCH /api/orders/bulk", () => {
  it("401 sin sesión", async () => {
    mocks.requireSession.mockResolvedValue(null);
    expect((await call({ ids: ["o1"], status: "SHIPPED" })).status).toBe(401);
    expect(mocks.bulkUpdateOrderStatus).not.toHaveBeenCalled();
  });

  it("400 con body inválido o no JSON", async () => {
    expect((await call({ ids: [], status: "SHIPPED" })).status).toBe(400);
    expect((await call(undefined, "{roto")).status).toBe(400);
    expect(mocks.bulkUpdateOrderStatus).not.toHaveBeenCalled();
  });

  it("200 con { updated, unchanged } y el usuario como actor", async () => {
    mocks.bulkUpdateOrderStatus.mockResolvedValue({ ok: true, updated: 2, unchanged: 1 });

    const response = await call({ ids: ["o1", "o2", "o3"], status: "SHIPPED" });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ updated: 2, unchanged: 1 });
    expect(mocks.bulkUpdateOrderStatus).toHaveBeenCalledWith({
      input: { ids: ["o1", "o2", "o3"], status: "SHIPPED" },
      actorId: "user-1",
    });
  });

  it("404 con missingIds y 409 en conflicto", async () => {
    mocks.bulkUpdateOrderStatus.mockResolvedValueOnce({
      ok: false,
      error: { code: "NOT_FOUND", message: "Faltan pedidos", details: { missingIds: ["x"] } },
    });
    const notFound = await call({ ids: ["x"], status: "SHIPPED" });
    expect(notFound.status).toBe(404);
    expect((await notFound.json()).error.details.missingIds).toEqual(["x"]);

    mocks.bulkUpdateOrderStatus.mockResolvedValueOnce({
      ok: false,
      error: { code: "CONFLICT", message: "Conflicto", details: { orderIds: ["o1"] } },
    });
    expect((await call({ ids: ["o1"], status: "SHIPPED" })).status).toBe(409);
  });

  it("500 sin filtrar detalles internos", async () => {
    mocks.bulkUpdateOrderStatus.mockRejectedValue(new Error("detalle secreto"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await call({ ids: ["o1"], status: "SHIPPED" });
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("secreto");
  });
});
