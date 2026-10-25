
import { describe, expect, it } from "vitest";

import {
  createProductSchema,
  productQuerySchema,
  updateProductSchema,
} from "@/lib/schemas/product";

const validProduct = {
  sku: "OM-TEC-001",
  name: "Teclado mecánico",
  category: "Tecnología",
  priceCents: 250000,
  costCents: 160000,
  stock: 15,
};

describe("Product schemas", () => {
  it("acepta un producto válido", () => {
    expect(createProductSchema.safeParse(validProduct).success).toBe(true);
  });

  it("rechaza SKU inválido", () => {
    expect(
      createProductSchema.safeParse({
        ...validProduct,
        sku: "abc?",
      }).success
    ).toBe(false);
  });

  it("rechaza precios negativos", () => {
    expect(
      createProductSchema.safeParse({
        ...validProduct,
        priceCents: -100,
      }).success
    ).toBe(false);
  });

  it("rechaza inventario negativo", () => {
    expect(
      createProductSchema.safeParse({
        ...validProduct,
        stock: -1,
      }).success
    ).toBe(false);
  });

  it("permite actualizaciones parciales", () => {
    expect(updateProductSchema.safeParse({ stock: 20 }).success).toBe(true);
  });

  it("aplica la paginación predeterminada", () => {
    const result = productQuerySchema.parse({});

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("rechaza límites mayores a 100", () => {
    expect(
      productQuerySchema.safeParse({ limit: "101" }).success
    ).toBe(false);
  });
});
