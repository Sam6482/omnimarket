
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  prisma: {
    product: {
      count: mocks.count,
      findMany: mocks.findMany,
    },
  },
}));

import { listProducts } from "@/server/services/products/list-products";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.count.mockResolvedValue(40);
  mocks.findMany.mockResolvedValue([
    {
      id: "seed-product-001",
      sku: "OM-TEC-001",
      name: "Teclado mecánico",
      category: "Tecnología",
      priceCents: 250000,
      costCents: 160000,
      stock: 15,
      createdAt: new Date("2026-10-24T12:00:00Z"),
      updatedAt: new Date("2026-10-24T12:00:00Z"),
    },
  ]);
});

describe("listProducts", () => {
  it("devuelve productos y paginación", async () => {
    const result = await listProducts({
      page: 1,
      limit: 20,
    });

    expect(result.data).toHaveLength(1);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 40,
      totalPages: 2,
      hasNext: true,
    });
  });

  it("calcula correctamente la segunda página", async () => {
    await listProducts({
      page: 2,
      limit: 10,
    });

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      })
    );
  });

  it("busca por nombre o SKU", async () => {
    await listProducts({
      page: 1,
      limit: 20,
      q: "teclado",
    });

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            {
              name: {
                contains: "teclado",
                mode: "insensitive",
              },
            },
            {
              sku: {
                contains: "teclado",
                mode: "insensitive",
              },
            },
          ],
        }),
      })
    );
  });

  it("filtra por categoría", async () => {
    await listProducts({
      page: 1,
      limit: 20,
      category: "Tecnología",
    });

    expect(mocks.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        category: {
          equals: "Tecnología",
          mode: "insensitive",
        },
      }),
    });
  });

  it("devuelve correctamente una lista vacía", async () => {
    mocks.count.mockResolvedValue(0);
    mocks.findMany.mockResolvedValue([]);

    const result = await listProducts({
      page: 1,
      limit: 20,
    });

    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
    expect(result.pagination.hasNext).toBe(false);
  });
});
