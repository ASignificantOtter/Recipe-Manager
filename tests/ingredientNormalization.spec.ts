import { describe, it, expect } from "vitest";
import { parseIngredient, normalizeParsedIngredient } from "../src/lib/uploader/ingredientParser";

describe("normalizeParsedIngredient", () => {
  it("converts cup sugar to grams using density", () => {
    const p = parseIngredient("1 cup sugar");
    const norm = normalizeParsedIngredient(p as any);
    // 1 cup = 240 ml, sugar density 0.85 -> 204 g
    expect(norm.canonicalUnit).toBe("g");
    expect(norm.canonicalQuantity).toBeCloseTo(204, 0);
  });

  it("converts tbsp to ml when density not known", () => {
    const p = parseIngredient("2 tbsp olive oil");
    const norm = normalizeParsedIngredient(p as any);
    // 2 tbsp = 30 ml; olive oil density 0.91 => ~27.3 g -> should convert to g
    expect(norm.canonicalUnit).toBe("g");
    expect(norm.canonicalQuantity).toBeGreaterThan(20);
  });
});
