import { describe, it, expect } from "vitest";
import { parseIngredient, normalizeParsedIngredient } from "../src/lib/uploader/ingredientParser";

describe("normalizeParsedIngredient", () => {
  describe("Unit Normalization", () => {
    it("converts cup to grams for water (density 1.0)", () => {
      const p = parseIngredient("1 cup water");
      const norm = normalizeParsedIngredient(p as any);
      // Water has density 1.0, so 240 ml = 240 g
      expect(norm.canonicalUnit).toBe("g");
      expect(norm.canonicalQuantity).toBeCloseTo(240, 0);
    });

    it("converts tablespoon to grams for water", () => {
      const p = parseIngredient("2 tbsp water");
      const norm = normalizeParsedIngredient(p as any);
      // 2 tbsp = 30 ml; water density 1.0 => 30 g
      expect(norm.canonicalUnit).toBe("g");
      expect(norm.canonicalQuantity).toBeCloseTo(30, 0);
    });

    it("converts teaspoon to ml", () => {
      const p = parseIngredient("1 tsp salt");
      const norm = normalizeParsedIngredient(p as any);
      expect(norm.canonicalUnit).toBe("ml");
      expect(norm.canonicalQuantity).toBeCloseTo(5, 0);
    });

    it("converts liter to grams for milk (density 1.03)", () => {
      const p = parseIngredient("1 l milk");
      const norm = normalizeParsedIngredient(p as any);
      // 1 l = 1000 ml; milk density 1.03 => ~1030 g
      expect(norm.canonicalUnit).toBe("g");
      expect(norm.canonicalQuantity).toBeCloseTo(1030, 0);
    });

    it("handles alias variations", () => {
      const p1 = parseIngredient("2 tbsp butter");
      const p2 = parseIngredient("2 tablespoon butter");
      const norm1 = normalizeParsedIngredient(p1 as any);
      const norm2 = normalizeParsedIngredient(p2 as any);
      expect(norm1.canonicalQuantity).toBeCloseTo(norm2.canonicalQuantity, 1);
    });

    it("converts ounces to grams", () => {
      const p = parseIngredient("4 oz flour");
      const norm = normalizeParsedIngredient(p as any);
      expect(norm.canonicalUnit).toBe("g");
      expect(norm.canonicalQuantity).toBeCloseTo(113.4, 0);
    });

    it("converts pounds to grams", () => {
      const p = parseIngredient("1 lb sugar");
      const norm = normalizeParsedIngredient(p as any);
      expect(norm.canonicalUnit).toBe("g");
      expect(norm.canonicalQuantity).toBeCloseTo(453.592, 0);
    });
  });

  describe("Density-based Conversions", () => {
    it("converts cup sugar to grams using density", () => {
      const p = parseIngredient("1 cup sugar");
      const norm = normalizeParsedIngredient(p as any);
      // 1 cup = 240 ml, sugar density 0.85 -> 204 g
      expect(norm.canonicalUnit).toBe("g");
      expect(norm.canonicalQuantity).toBeCloseTo(204, 0);
    });

    it("converts cup flour to grams using density", () => {
      const p = parseIngredient("2 cups flour");
      const norm = normalizeParsedIngredient(p as any);
      // 2 cups = 480 ml, flour density 0.53 -> 254.4 g
      expect(norm.canonicalUnit).toBe("g");
      expect(norm.canonicalQuantity).toBeCloseTo(254.4, 0);
    });

    it("converts cup butter to grams using density", () => {
      const p = parseIngredient("1 cup butter");
      const norm = normalizeParsedIngredient(p as any);
      // 1 cup = 240 ml, butter density 0.911 -> 218.6 g
      expect(norm.canonicalUnit).toBe("g");
      expect(norm.canonicalQuantity).toBeCloseTo(218.6, 0);
    });

    it("converts cup milk to grams using density", () => {
      const p = parseIngredient("1 cup milk");
      const norm = normalizeParsedIngredient(p as any);
      // 1 cup = 240 ml, milk density 1.03 -> 247.2 g
      expect(norm.canonicalUnit).toBe("g");
      expect(norm.canonicalQuantity).toBeCloseTo(247.2, 0);
    });

    it("converts tbsp olive oil to grams", () => {
      const p = parseIngredient("2 tbsp olive oil");
      const norm = normalizeParsedIngredient(p as any);
      // 2 tbsp = 30 ml, olive oil density 0.91 -> 27.3 g
      expect(norm.canonicalUnit).toBe("g");
      expect(norm.canonicalQuantity).toBeCloseTo(27.3, 1);
    });

    it("handles ingredients without known density", () => {
      const p = parseIngredient("1 cup unknown ingredient");
      const norm = normalizeParsedIngredient(p as any);
      // Should stay as ml since no density for "unknown ingredient"
      expect(norm.canonicalUnit).toBe("ml");
      expect(norm.canonicalQuantity).toBe(240);
    });
  });

  describe("Edge Cases", () => {
    it("handles zero quantity", () => {
      const p = parseIngredient("eggs");
      const norm = normalizeParsedIngredient(p as any);
      expect(norm.canonicalQuantity).toBeUndefined();
    });

    it("preserves notes through normalization", () => {
      const p = parseIngredient("1 cup sugar, granulated");
      const norm = normalizeParsedIngredient(p as any);
      expect(norm.notes).toBe("granulated");
    });

    it("preserves ingredient name through normalization", () => {
      const p = parseIngredient("2 cups all-purpose flour");
      const norm = normalizeParsedIngredient(p as any);
      expect(norm.name).toBe("all-purpose flour");
    });

    it("handles different case variations", () => {
      const p1 = parseIngredient("1 Cup Sugar");
      const p2 = parseIngredient("1 CUP SUGAR");
      const norm1 = normalizeParsedIngredient(p1 as any);
      const norm2 = normalizeParsedIngredient(p2 as any);
      expect(norm1.canonicalQuantity).toBeCloseTo(norm2.canonicalQuantity, 1);
    });

    it("handles mixed units in input", () => {
      // "2 1/2 cups" should normalize correctly
      const p = parseIngredient("2 1/2 cups water");
      const norm = normalizeParsedIngredient(p as any);
      expect(norm.canonicalQuantity).toBeCloseTo(600, 0); // 2.5 * 240
    });
  });
});
