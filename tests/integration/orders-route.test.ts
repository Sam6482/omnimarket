import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({ requireSession: vi.fn(), createOrder: vi.fn() }));

vi.mock("@/server/auth", () => ({ requireSession: mocks.requireSession }));
vi.mock("@/server/services/orders/list-orders", () => ({ listOrders: vi.fn() }));
vi.mock("@/server/services/orders/create-order", async () => {
  const actual = await vi.importActual<typeof import("@/server/services/orders/create-order")>(
    "@/server/services/orders/create-order"
  );
  return { MissingProductsError: actual.MissingProductsError, createOrder: mocks.createOrder };
});
vi.mock("@/server/db", () => ({ prisma: {} }));

import { POST } from "@/app/api/orders/route";
import { MissingProductsError } from "@/server/services/orders/create-order";

const validBody = {
  customerName: "Ana López",
  customerEmail: "ana@example.com",
  items: [{ productId: "seed-product-001", quantity: 2 }],
};

function post(body: unknown) {
  return POST({ json: async () => body } as unknown as Parameters<typeof POST>[0]);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireSession.mockResolvedValue({ id: "user-1", email: null, name: null });
});

describe("POST /api/orders", () => {
  it("401 sin sesión, sin llamar al servicio", async () => {
    mocks.requireSession.mockResolvedValue(null);
    expect((await post(validBody)).status).toBe(401);
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it("400 si un producto supera 999 unidades sumando repetidos", async () => {
    const response = await post({
      ...validBody,
      items: [
        { productId: "p1", quantity: 600 },
        { productId: "p1", quantity: 400 },
      ],
    });
    expect(response.status).toBe(400);
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it("ignora montos enviados por el cliente (los calcula el servidor)", async () => {
    mocks.createOrder.mockResolvedValue({ id: "o1" });
    await post({ ...validBody, totalCents: 1 });
    expect(mocks.createOrder.mock.calls[0][0]).not.toHaveProperty("totalCents");
  });

  it("201 con el pedido creado y el usuario como creador", async () => {
    mocks.createOrder.mockResolvedValue({ id: "o1", number: "OM-1201" });
    const response = await post(validBody);
    expect(response.status).toBe(201);
    expect(mocks.createOrder).toHaveBeenCalledWith(validBody, "user-1");
  });

  it("404 si un producto no existe", async () => {
    mocks.createOrder.mockRejectedValue(new MissingProductsError());
    expect((await post(validBody)).status).toBe(404);
  });

  it("409 si la transacción choca con otra operación simultánea (P2034)", async () => {
    mocks.createOrder.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("write conflict", { code: "P2034", clientVersion: "6.19.3" })
    );
    const response = await post(validBody);
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("CONFLICT");
  });
});
