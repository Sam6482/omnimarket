import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  updateOrderStatus: vi.fn(),
}));

// Sesión simulada SOLO en pruebas; la ruta real usa el contrato de @/server/auth.
vi.mock("@/server/auth", () => ({ requireSession: mocks.requireSession }));
vi.mock("@/server/services/orders/update-status", () => ({ updateOrderStatus: mocks.updateOrderStatus }));

import { PATCH } from "@/app/api/orders/[id]/status/route";

type PatchRequest = Parameters<typeof PATCH>[0];

function call(body: unknown, id = "order-1", { rawBody }: { rawBody?: string } = {}) {
  const request = {
    json: async () => (rawBody !== undefined ? JSON.parse(rawBody) : body),
  } as unknown as PatchRequest;
  return PATCH(request, { params: Promise.resolve({ id }) });
}

const user = { id: "user-1", email: "ana@example.com", name: "Ana" };
const validBody = { status: "SHIPPED", position: 1500, expectedUpdatedAt: "2026-10-24T18:00:00.000Z" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireSession.mockResolvedValue(user);
});

describe("PATCH /api/orders/:id/status", () => {
  it("responde 401 sin sesión y no toca el servicio", async () => {
    mocks.requireSession.mockResolvedValue(null);

    const response = await call(validBody);

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("UNAUTHENTICATED");
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
  });

  it("responde 400 con detalle por campo si el body es inválido", async () => {
    const response = await call({ status: "LOST", position: "x" });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details.issues.map((issue: { path: string }) => issue.path)).toEqual(
      expect.arrayContaining(["status", "position"])
    );
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
  });

  it("responde 400 si el body no es JSON", async () => {
    const response = await call(undefined, "order-1", { rawBody: "{no-json" });

    expect(response.status).toBe(400);
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
  });

  it("responde 200 con el contrato y registra al usuario como actor", async () => {
    const updatedAt = new Date("2026-10-24T18:05:00.000Z");
    mocks.updateOrderStatus.mockResolvedValue({
      ok: true,
      order: { id: "order-1", status: "SHIPPED", position: 1500, updatedAt },
    });

    const response = await call(validBody);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      id: "order-1",
      status: "SHIPPED",
      position: 1500,
      updatedAt: updatedAt.toISOString(),
    });
    expect(mocks.updateOrderStatus).toHaveBeenCalledWith({ orderId: "order-1", input: validBody, actorId: "user-1" });
  });

  it("traduce NOT_FOUND a 404 y CONFLICT a 409 con detalles para revertir", async () => {
    mocks.updateOrderStatus.mockResolvedValueOnce({
      ok: false,
      error: { code: "NOT_FOUND", message: "El pedido no existe.", details: { orderId: "order-1" } },
    });
    expect((await call(validBody)).status).toBe(404);

    mocks.updateOrderStatus.mockResolvedValueOnce({
      ok: false,
      error: {
        code: "CONFLICT",
        message: "Otro usuario modificó el pedido.",
        details: { orderId: "order-1", reason: "CONCURRENT_UPDATE", currentUpdatedAt: "2026-10-24T18:04:00.000Z" },
      },
    });
    const conflict = await call(validBody);
    expect(conflict.status).toBe(409);
    expect((await conflict.json()).error.details.reason).toBe("CONCURRENT_UPDATE");
  });

  it("responde 500 sin filtrar detalles internos", async () => {
    mocks.updateOrderStatus.mockRejectedValue(new Error("connection string secreta"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await call(validBody);

    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("secreta");
  });
});
