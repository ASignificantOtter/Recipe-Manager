import { describe, expect, it } from "vitest";
import {
  getScalingMultiplier,
  sanitizeServingCount,
  scaleQuantity,
  roundQuantity,
} from "../src/lib/utils/scaling";

describe("scaling utilities", () => {
  it("sanitizes invalid serving counts", () => {
    expect(sanitizeServingCount(undefined)).toBe(1);
    expect(sanitizeServingCount(0)).toBe(1);
    expect(sanitizeServingCount(-3)).toBe(1);
  });

  it("calculates scaling multiplier", () => {
    expect(getScalingMultiplier(2, 4)).toBe(2);
    expect(getScalingMultiplier(4, 2)).toBe(0.5);
  });

  it("scales quantities with rounding", () => {
    expect(scaleQuantity(1.25, 2, 5)).toBe(3.13);
    expect(scaleQuantity(3, 3, 3)).toBe(3);
  });

  it("rounds consistently for fractional values", () => {
    expect(roundQuantity(1.005)).toBe(1);
    expect(roundQuantity(1.999)).toBe(2);
  });
});
