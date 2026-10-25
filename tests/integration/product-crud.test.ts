
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  findUnique: vi.fn(),
  count: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  prisma: {
    product: {
      create: mocks.create,
      update: mocks.update,
    },
    $transaction: vi.fn(async (callback) =>
      callback({
        product: {
          findUnique: mocks.findUnique,
          delete: mocks.delete,
        },
        orderItem: {
          count: mocks.count,
        },
      })
    ),
  },
}));

import { createProduct } from "@/server/services/products/create-product";
import {
  deleteProduct,
  updateProduct,
} from "@/server/services/products/manage-product";

const input = {
  sku: "OM-TEC-999",
  name: "Teclado mecánico",
  category: "Tecnología",
  priceCents: 250000,
  costCents: 160000,
  stock: 10,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CRUD de productos", () => {
  it("crea un producto con datos válidos", async () => {
    mocks.create.mockResolvedValue({ id: "prod-1", ...input });

    const result = await createProduct(input);

    expect(result.id).toBe("prod-1");
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: input,
      })
    );
  });

  it("actualiza un producto existente", async () => {
    mocks.update.mockResolvedValue({
      id: "prod-1",
      ...input,
      stock: 25,
    });

    const result = await updateProduct("prod-1", { stock: 25 });

    expect(result.stock).toBe(25);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prod-1" },
        data: { stock: 25 },
      })
    );
  });

  it("devuelve NOT_FOUND si el producto no existe", async () => {
    mocks.findUnique.mockResolvedValue(null);

    expect(await deleteProduct("missing")).toBe("NOT_FOUND");
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("impide eliminar productos asociados a pedidos", async () => {
    mocks.findUnique.mockResolvedValue({ id: "prod-1" });
    mocks.count.mockResolvedValue(2);

    expect(await deleteProduct("prod-1")).toBe("CONFLICT");
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("elimina productos sin pedidos asociados", async () => {
    mocks.findUnique.mockResolvedValue({ id: "prod-1" });
    mocks.count.mockResolvedValue(0);
    mocks.delete.mockResolvedValue({ id: "prod-1" });

    expect(await deleteProduct("prod-1")).toBe("DELETED");
    expect(mocks.delete).toHaveBeenCalledWith({
      where: { id: "prod-1" },
    });
  });
});
