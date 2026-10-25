import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

/**
 * Reglas de negocio de pedidos (R7): importes calculados por el servidor desde Product,
 * conservación de importes históricos y errores sin escrituras parciales.
 */

const tx = vi.hoisted(() => ({
  order: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
  product: { findMany: vi.fn() },
}));

vi.mock("@/server/db", () => ({
  prisma: { $transaction: vi.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)) },
}));

import { MissingProductsError, createOrder } from "@/server/services/orders/create-order";
import { MissingOrderProductsError, updateOrder } from "@/server/services/orders/manage-orders";

const products = [
  { id: "p1", priceCents: 129900, costCents: 80000 },
  { id: "p2", priceCents: 45900, costCents: 23000 },
];

const savedOrder = (data: Record<string, unknown>) => ({
  id: "o1",
  number: 1201,
  status: "PENDING",
  position: 1000,
  createdAt: new Date("2026-10-25T00:00:00.000Z"),
  updatedAt: new Date("2026-10-25T00:00:00.000Z"),
  ...data,
});

beforeEach(() => {
  vi.clearAllMocks();
  tx.order.findUnique.mockResolvedValue({ id: "o1" });
  tx.order.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => savedOrder(data));
  tx.order.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => savedOrder(data));
});

describe("createOrder", () => {
  it("calcula total, costo y unidades con los precios de la base, sumando artículos repetidos", async () => {
    tx.product.findMany.mockResolvedValue(products);

    const order = await createOrder(
      {
        customerName: "Ana",
        customerEmail: "ana@example.com",
        items: [
          { productId: "p1", quantity: 2 },
          { productId: "p2", quantity: 1 },
          { productId: "p1", quantity: 1 },
        ],
      },
      "user-1"
    );

    const data = tx.order.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      totalCents: 3 * 129900 + 45900,
      costCents: 3 * 80000 + 23000,
      itemsCount: 4,
      status: "PENDING",
      createdById: "user-1",
    });
    expect(data.items.create).toEqual([
      { productId: "p1", quantity: 3, unitPriceCents: 129900, unitCostCents: 80000 },
      { productId: "p2", quantity: 1, unitPriceCents: 45900, unitCostCents: 23000 },
    ]);
    expect(order.number).toBe("OM-1201");
  });

  it("rechaza productos inexistentes sin crear el pedido", async () => {
    tx.product.findMany.mockResolvedValue([products[0]]);

    await expect(
      createOrder({
        customerName: "Ana",
        customerEmail: "ana@example.com",
        items: [
          { productId: "p1", quantity: 1 },
          { productId: "no-existe", quantity: 1 },
        ],
      })
    ).rejects.toBeInstanceOf(MissingProductsError);
    expect(tx.order.create).not.toHaveBeenCalled();
  });
});

describe("updateOrder", () => {
  it("si solo cambia el cliente, conserva los importes y artículos históricos", async () => {
    await updateOrder("o1", { customerName: "Ana María" });

    const data = tx.order.update.mock.calls[0][0].data;
    expect(data).toEqual({ customerName: "Ana María", customerEmail: undefined });
    expect(data).not.toHaveProperty("totalCents");
    expect(data).not.toHaveProperty("items");
    expect(tx.product.findMany).not.toHaveBeenCalled();
  });

  it("si cambian los artículos, los reemplaza y recalcula con los precios actuales", async () => {
    tx.product.findMany.mockResolvedValue(products);

    await updateOrder("o1", {
      items: [
        { productId: "p2", quantity: 2 },
        { productId: "p1", quantity: 1 },
      ],
    });

    const data = tx.order.update.mock.calls[0][0].data;
    expect(data).toMatchObject({
      totalCents: 129900 + 2 * 45900,
      costCents: 80000 + 2 * 23000,
      itemsCount: 3,
    });
    expect(data.items.deleteMany).toEqual({});
    expect(data.items.create).toHaveLength(2);
  });

  it("rechaza productos inexistentes sin modificar el pedido", async () => {
    tx.product.findMany.mockResolvedValue([products[0]]);

    await expect(
      updateOrder("o1", { items: [{ productId: "p1", quantity: 1 }, { productId: "x", quantity: 1 }] })
    ).rejects.toBeInstanceOf(MissingOrderProductsError);
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it("responde P2025 si el pedido no existe", async () => {
    tx.order.findUnique.mockResolvedValue(null);

    const error = await updateOrder("no-existe", { customerName: "X" }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect((error as Prisma.PrismaClientKnownRequestError).code).toBe("P2025");
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it("como defensa adicional, rechaza más de 999 unidades del mismo producto", async () => {
    await expect(
      updateOrder("o1", { items: [{ productId: "p1", quantity: 999 }, { productId: "p1", quantity: 1 }] })
    ).rejects.toThrow("Cantidad máxima excedida");
    expect(tx.order.update).not.toHaveBeenCalled();
  });
});
