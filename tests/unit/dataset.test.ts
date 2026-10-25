import { describe, expect, it } from "vitest";
import {
  DATASET_ANCHOR,
  DATASET_DAYS,
  DATASET_SEED,
  ORDER_COUNT,
  ORDER_ITEM_COUNT,
  PRODUCT_COUNT,
  buildDataset,
  createRandom,
} from "@/server/seed/dataset";
import { ORDER_STATUSES } from "@/lib/schemas/order-status";

const dataset = buildDataset();

describe("buildDataset (semilla 42)", () => {
  it("es determinista: dos ejecuciones producen exactamente los mismos datos", () => {
    expect(JSON.stringify(buildDataset())).toBe(JSON.stringify(dataset));
    expect(dataset.seed).toBe(DATASET_SEED);
  });

  it("genera los conteos del contrato: 40 productos, 1,200 pedidos y 3,100 líneas", () => {
    expect(dataset.products).toHaveLength(PRODUCT_COUNT);
    expect(dataset.orders).toHaveLength(ORDER_COUNT);
    expect(dataset.orderItems).toHaveLength(ORDER_ITEM_COUNT);
    expect([PRODUCT_COUNT, ORDER_COUNT, ORDER_ITEM_COUNT]).toEqual([40, 1200, 3100]);
  });

  it("usa SKUs únicos con el formato de docs/API.md y precios coherentes", () => {
    const skus = dataset.products.map((product) => product.sku);
    expect(new Set(skus).size).toBe(skus.length);
    for (const product of dataset.products) {
      expect(product.sku).toMatch(/^[A-Z0-9-]{3,32}$/);
      expect(Number.isInteger(product.priceCents)).toBe(true);
      expect(product.costCents).toBeGreaterThan(0);
      expect(product.costCents).toBeLessThan(product.priceCents);
      expect(product.stock).toBeGreaterThanOrEqual(0);
    }
  });

  it("calcula total, costo y unidades de cada pedido a partir de sus líneas", () => {
    const linesByOrder = Map.groupBy(dataset.orderItems, (item) => item.orderId);
    for (const order of dataset.orders) {
      const lines = linesByOrder.get(order.id) ?? [];
      expect(lines.length).toBeGreaterThanOrEqual(1);
      expect(lines.length).toBeLessThanOrEqual(4);
      expect(new Set(lines.map((line) => line.productId)).size).toBe(lines.length);
      expect(order.totalCents).toBe(lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0));
      expect(order.costCents).toBe(lines.reduce((sum, l) => sum + l.unitCostCents * l.quantity, 0));
      expect(order.itemsCount).toBe(lines.reduce((sum, l) => sum + l.quantity, 0));
    }
  });

  it("toma precios de los productos reales (el cliente nunca define montos)", () => {
    const products = new Map(dataset.products.map((product) => [product.id, product]));
    for (const item of dataset.orderItems) {
      const product = products.get(item.productId);
      expect(product).toBeDefined();
      expect(item.unitPriceCents).toBe(product?.priceCents);
      expect(item.unitCostCents).toBe(product?.costCents);
    }
  });

  it("numera OM-1…OM-1200 en orden cronológico y con fechas válidas", () => {
    const oldest = DATASET_ANCHOR.getTime() - DATASET_DAYS * 24 * 60 * 60 * 1000;
    dataset.orders.forEach((order, index) => {
      expect(order.number).toBe(index + 1);
      expect(order.createdAt.getTime()).toBeGreaterThanOrEqual(oldest);
      expect(order.updatedAt.getTime()).toBeGreaterThanOrEqual(order.createdAt.getTime());
      expect(order.updatedAt.getTime()).toBeLessThanOrEqual(DATASET_ANCHOR.getTime());
      if (index > 0) {
        expect(order.createdAt.getTime()).toBeGreaterThanOrEqual(dataset.orders[index - 1].createdAt.getTime());
      }
    });
  });

  it("llena las cinco columnas del Kanban con posiciones únicas por columna", () => {
    for (const status of ORDER_STATUSES) {
      const positions = dataset.orders.filter((order) => order.status === status).map((o) => o.position);
      expect(positions.length).toBeGreaterThan(0);
      expect(new Set(positions).size).toBe(positions.length);
    }
  });
});

describe("createRandom", () => {
  it("repite la secuencia con la misma semilla y cambia con otra", () => {
    const a = createRandom(42);
    const b = createRandom(42);
    const c = createRandom(7);
    const seqA = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(seqA);
    expect([c(), c(), c()]).not.toEqual(seqA);
    for (const value of seqA) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
