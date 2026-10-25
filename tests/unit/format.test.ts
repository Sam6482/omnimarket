import { describe, expect, it } from "vitest";
import { formatCurrency, formatPercent } from "@/lib/format";

describe("formatCurrency (MXN, es-MX)", () => {
  it("convierte centavos a pesos con separador de miles y 2 decimales", () => {
    expect(formatCurrency(250_000)).toBe("$2,500.00");
    expect(formatCurrency(123_456_789)).toBe("$1,234,567.89");
    expect(formatCurrency(5)).toBe("$0.05");
  });

  it("formatea cero y montos negativos", () => {
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(-123_450)).toBe("-$1,234.50");
  });

  it("rechaza montos que no son centavos enteros", () => {
    expect(() => formatCurrency(10.5)).toThrow(RangeError);
    expect(() => formatCurrency(Number.NaN)).toThrow(RangeError);
  });
});

describe("formatPercent", () => {
  it("muestra un decimal y el símbolo %", () => {
    expect(formatPercent(36)).toBe("36.0 %");
    expect(formatPercent(33.333)).toBe("33.3 %");
  });

  it("rechaza valores no finitos", () => {
    expect(() => formatPercent(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
