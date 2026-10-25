import { describe, expect, it } from "vitest";
import { BULK_MAX_IDS, bulkUpdateSchema } from "@/lib/schemas/bulk";

const ids = (count: number) => Array.from({ length: count }, (_, index) => `order-${index + 1}`);

describe("bulkUpdateSchema (U7)", () => {
  it("acepta de 1 a 100 ids únicos con un estado válido", () => {
    expect(bulkUpdateSchema.safeParse({ ids: ids(1), status: "SHIPPED" }).success).toBe(true);
    expect(bulkUpdateSchema.safeParse({ ids: ids(BULK_MAX_IDS), status: "DELIVERED" }).success).toBe(true);
  });

  it("rechaza listas vacías o de más de 100 ids", () => {
    expect(bulkUpdateSchema.safeParse({ ids: [], status: "SHIPPED" }).success).toBe(false);
    expect(bulkUpdateSchema.safeParse({ ids: ids(BULK_MAX_IDS + 1), status: "SHIPPED" }).success).toBe(false);
  });

  it("rechaza ids repetidos, vacíos o que no son texto", () => {
    expect(bulkUpdateSchema.safeParse({ ids: ["a", "b", "a"], status: "SHIPPED" }).success).toBe(false);
    expect(bulkUpdateSchema.safeParse({ ids: ["  "], status: "SHIPPED" }).success).toBe(false);
    expect(bulkUpdateSchema.safeParse({ ids: [1, 2], status: "SHIPPED" }).success).toBe(false);
  });

  it("rechaza estados inválidos o ausentes", () => {
    expect(bulkUpdateSchema.safeParse({ ids: ids(2), status: "LOST" }).success).toBe(false);
    expect(bulkUpdateSchema.safeParse({ ids: ids(2) }).success).toBe(false);
  });
});
