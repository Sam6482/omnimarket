
import { describe, expect, it } from "vitest";
import {
  createOrderSchema,
  updateOrderSchema,
  orderQuerySchema,
} from "@/lib/schemas/order";

const validItem = {
  productId: "product-123",
  quantity: 2,
};

describe("Order schemas", () => {
  it("acepta crear un pedido válido", () => {
    const result = createOrderSchema.safeParse({
      customerName: "Cliente Prueba",
      customerEmail: "cliente@example.com",
      items: [validItem],
    });

    expect(result.success).toBe(true);
  });

  it("rechaza pedidos sin artículos", () => {
    const result = createOrderSchema.safeParse({
      customerName: "Cliente Prueba",
      customerEmail: "cliente@example.com",
      items: [],
    });

    expect(result.success).toBe(false);
  });

  it("rechaza cantidades fuera de rango", () => {
    const result = createOrderSchema.safeParse({
      customerName: "Cliente Prueba",
      customerEmail: "cliente@example.com",
      items: [
        {
          productId: "product-123",
          quantity: 1000,
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rechaza cantidades duplicadas que suman más de 999", () => {
    const result = createOrderSchema.safeParse({
      customerName: "Cliente Prueba",
      customerEmail: "cliente@example.com",
      items: [
        { productId: "product-123", quantity: 600 },
        { productId: "product-123", quantity: 500 },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("permite editar únicamente el nombre", () => {
    const result = updateOrderSchema.safeParse({
      customerName: "Nombre Actualizado",
    });

    expect(result.success).toBe(true);
  });

  it("permite editar únicamente los artículos", () => {
    const result = updateOrderSchema.safeParse({
      items: [validItem],
    });

    expect(result.success).toBe(true);
  });

  it("rechaza actualizaciones vacías", () => {
    expect(updateOrderSchema.safeParse({}).success).toBe(false);
  });

  it("rechaza campos no autorizados en la edición", () => {
    const result = updateOrderSchema.safeParse({
      totalCents: 1,
    });

    expect(result.success).toBe(false);
  });

  it("aplica paginación predeterminada", () => {
    const result = orderQuerySchema.parse({});

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.sort).toBe("createdAt:desc");
  });

  it("rechaza rangos de fechas invertidos", () => {
    const result = orderQuerySchema.safeParse({
      from: "2026-10-26T00:00:00Z",
      to: "2026-10-25T00:00:00Z",
    });

    expect(result.success).toBe(false);
  });
});
