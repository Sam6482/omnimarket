
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  groupBy: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  prisma: {
    order: {
      groupBy: mocks.groupBy,
      findMany: mocks.findMany,
    },
  },
}));

import { GET } from "@/app/api/test/analytics/route";

function request(query = "") {
  return {
    nextUrl: new URL(`http://localhost:3000/api/test/analytics${query}`),
  } as Parameters<typeof GET>[0];
}

const demoOrder = {
  id: "order-1",
  number: 1042,
  createdAt: new Date("2026-10-20T15:04:05.000Z"),
  status: "SHIPPED",
  customerName: "Ana López",
  itemsCount: 2,
  totalCents: 250000,
  costCents: 160000,
};

beforeEach(() => {
  vi.clearAllMocks();

  mocks.groupBy.mockResolvedValue([
    {
      status: "SHIPPED",
      _count: { _all: 1 },
      _sum: {
        totalCents: 250000,
        costCents: 160000,
      },
    },
  ]);

  mocks.findMany.mockResolvedValue([demoOrder]);
});

describe("GET /api/test/analytics", () => {
  it("devuelve HTTP 200 y el formato requerido", async () => {
    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("summary");
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("pagination");
    expect(body).toHaveProperty("meta");
  });

  it("calcula correctamente ingresos y márgenes", async () => {
    const response = await GET(request());
    const body = await response.json();

    expect(body.summary.revenueCents).toBe(250000);
    expect(body.summary.orders).toBe(1);
    expect(body.summary.averageTicketCents).toBe(250000);
    expect(body.summary.grossMarginCents).toBe(90000);
    expect(body.summary.grossMarginPct).toBe(36);
  });

  it("respeta la paginación solicitada", async () => {
    const response = await GET(request("?page=2&limit=5"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
      })
    );
    expect(body.pagination.page).toBe(2);
    expect(body.pagination.limit).toBe(5);
  });

  it("rechaza límites superiores a 100", async () => {
    const response = await GET(request("?limit=200"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("rechaza páginas inválidas", async () => {
    const response = await GET(request("?page=abc"));

    expect(response.status).toBe(400);
  });

  it("aplica el filtro por estado", async () => {
    const response = await GET(request("?status=SHIPPED"));

    expect(response.status).toBe(200);
    expect(mocks.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "SHIPPED",
        }),
      })
    );
  });

  it("rechaza estados desconocidos", async () => {
    const response = await GET(request("?status=INVALID"));

    expect(response.status).toBe(400);
  });

  it("devuelve cero cuando no hay pedidos", async () => {
    mocks.groupBy.mockResolvedValue([]);
    mocks.findMany.mockResolvedValue([]);

    const response = await GET(request());
    const body = await response.json();

    expect(body.summary.orders).toBe(0);
    expect(body.summary.revenueCents).toBe(0);
    expect(body.summary.grossMarginPct).toBe(0);
    expect(body.data).toEqual([]);
    expect(body.pagination.totalPages).toBe(0);
  });

  it("incluye los encabezados de rendimiento", async () => {
    const response = await GET(request());

    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Server-Timing")).toContain("db;dur=");
    expect(response.headers.get("Server-Timing")).toContain("total;dur=");
  });

  it("devuelve HTTP 500 cuando falla la base de datos", async () => {
    mocks.groupBy.mockRejectedValue(new Error("Database unavailable"));

    const logSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const response = await GET(request());
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error.code).toBe("INTERNAL_ERROR");
      expect(body.error.message).not.toContain("Database unavailable");
    } finally {
      logSpy.mockRestore();
    }
  });
});
