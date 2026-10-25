import { describe, expect, it } from "vitest";
import { OrderStatus } from "@prisma/client";
import {
  ORDER_STATUSES,
  orderIdParamSchema,
  updateOrderStatusSchema,
} from "@/lib/schemas/order-status";

describe("updateOrderStatusSchema", () => {
  it("acepta un movimiento válido sin expectedUpdatedAt", () => {
    const result = updateOrderStatusSchema.safeParse({ status: "SHIPPED", position: 1500 });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ status: "SHIPPED", position: 1500 });
  });

  it("acepta expectedUpdatedAt en ISO 8601 (UTC y con desfase)", () => {
    for (const expectedUpdatedAt of ["2026-10-24T18:00:00.000Z", "2026-10-24T12:00:00-06:00"]) {
      const result = updateOrderStatusSchema.safeParse({
        status: "PENDING",
        position: 1000.5,
        expectedUpdatedAt,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rechaza estados fuera del enum (incluidas minúsculas)", () => {
    for (const status of ["shipped", "LOST", "", null]) {
      expect(updateOrderStatusSchema.safeParse({ status, position: 1 }).success).toBe(false);
    }
  });

  it("rechaza posiciones no finitas o que no son número", () => {
    for (const position of [Number.NaN, Number.POSITIVE_INFINITY, "1000", undefined]) {
      expect(updateOrderStatusSchema.safeParse({ status: "PENDING", position }).success).toBe(false);
    }
  });

  it("rechaza expectedUpdatedAt que no es fecha ISO completa", () => {
    for (const expectedUpdatedAt of ["2026-10-24", "ayer", "24/10/2026 18:00"]) {
      const result = updateOrderStatusSchema.safeParse({
        status: "PENDING",
        position: 1,
        expectedUpdatedAt,
      });
      expect(result.success).toBe(false);
    }
  });
});

describe("orderIdParamSchema", () => {
  it("rechaza ids vacíos y acepta un cuid", () => {
    expect(orderIdParamSchema.safeParse("   ").success).toBe(false);
    expect(orderIdParamSchema.safeParse("clx0order0000000000000001").success).toBe(true);
  });
});

describe("ORDER_STATUSES", () => {
  it("coincide con el enum OrderStatus de Prisma", () => {
    expect([...ORDER_STATUSES].sort()).toEqual(Object.values(OrderStatus).sort());
  });
});
