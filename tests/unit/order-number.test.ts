import { describe, expect, it } from "vitest";
import { formatOrderNumber } from "@/lib/order-number";

describe("formatOrderNumber", () => {
  it("respeta el contrato de número público OM-####", () => {
    expect(formatOrderNumber(1042)).toBe("OM-1042");
  });

  it("rechaza identificadores inválidos", () => {
    expect(() => formatOrderNumber(0)).toThrow(RangeError);
  });
});
