import { describe, expect, it } from "vitest";
import {
  averageTicketCents,
  grossMarginCents,
  grossMarginPct,
  percentage,
  summarizeFinance,
} from "@/lib/finance";

describe("averageTicketCents", () => {
  it("divide ingresos entre pedidos y redondea al centavo", () => {
    expect(averageTicketCents(1_000_000, 4)).toBe(250_000);
    expect(averageTicketCents(1_000, 3)).toBe(333);
    expect(averageTicketCents(2_000, 3)).toBe(667);
  });

  it("devuelve 0 si no hay pedidos (sin dividir entre cero)", () => {
    expect(averageTicketCents(0, 0)).toBe(0);
    expect(averageTicketCents(500_000, 0)).toBe(0);
  });

  it("rechaza montos que no son centavos enteros o pedidos negativos", () => {
    expect(() => averageTicketCents(10.5, 1)).toThrow(RangeError);
    expect(() => averageTicketCents(1_000, -1)).toThrow(RangeError);
  });
});

describe("grossMarginCents / grossMarginPct", () => {
  it("calcula margen en centavos y porcentaje con un decimal", () => {
    expect(grossMarginCents(250_000, 160_000)).toBe(90_000);
    expect(grossMarginPct(250_000, 160_000)).toBe(36);
    expect(grossMarginPct(300_000, 200_000)).toBe(33.3);
  });

  it("con costo 0 el margen es el 100 % de los ingresos", () => {
    expect(grossMarginCents(120_000, 0)).toBe(120_000);
    expect(grossMarginPct(120_000, 0)).toBe(100);
  });

  it("permite margen negativo (venta por debajo del costo) y 0 % sin ingresos", () => {
    expect(grossMarginCents(100_000, 150_000)).toBe(-50_000);
    expect(grossMarginPct(100_000, 150_000)).toBe(-50);
    expect(grossMarginPct(0, 0)).toBe(0);
  });
});

describe("percentage", () => {
  it("redondea a un decimal y devuelve 0 con total 0", () => {
    expect(percentage(1, 3)).toBe(33.3);
    expect(percentage(2, 3)).toBe(66.7);
    expect(percentage(5, 0)).toBe(0);
  });
});

describe("summarizeFinance", () => {
  it("arma el resumen del contrato de analytics", () => {
    expect(summarizeFinance({ revenueCents: 1_000_000, costCents: 630_000, orders: 4 })).toEqual({
      revenueCents: 1_000_000,
      orders: 4,
      averageTicketCents: 250_000,
      grossMarginCents: 370_000,
      grossMarginPct: 37,
    });
  });
});
