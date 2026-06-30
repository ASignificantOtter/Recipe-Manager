import { describe, expect, it } from "vitest";
import { calculateRecipeNutrition, scaleNutritionForServings } from "../src/lib/nutrition/calculate";

describe("nutrition calculation", () => {
  it("calculates totals when all ingredients are matched", () => {
    const summary = calculateRecipeNutrition(
      [
        { name: "rice", quantity: 200, unit: "g" },
        { name: "chicken breast", quantity: 200, unit: "g" },
      ],
      4
    );

    expect(summary.matchedIngredientCount).toBe(2);
    expect(summary.unmatchedIngredients).toHaveLength(0);
    expect(summary.total.calories).toBeGreaterThan(500);
    expect(summary.perServing.calories).toBeGreaterThan(100);
  });

  it("returns partial nutrition when some ingredients are unmatched", () => {
    const summary = calculateRecipeNutrition(
      [
        { name: "rice", quantity: 100, unit: "g" },
        { name: "mystery spice", quantity: 1, unit: "tbsp" },
      ],
      2
    );

    expect(summary.matchedIngredientCount).toBe(1);
    expect(summary.unmatchedIngredients).toContain("mystery spice");
    expect(summary.total.calories).toBeGreaterThan(0);
  });

  it("handles missing nutrition matches", () => {
    const summary = calculateRecipeNutrition(
      [{ name: "mystery ingredient", quantity: 2, unit: "cups" }],
      2
    );

    expect(summary.matchedIngredientCount).toBe(0);
    expect(summary.unmatchedIngredients).toContain("mystery ingredient");
    expect(summary.total.calories).toBe(0);
  });

  it("scales nutrition totals by target servings", () => {
    const summary = calculateRecipeNutrition([{ name: "rice", quantity: 200, unit: "g" }], 2);
    const scaled = scaleNutritionForServings(summary, 4);

    expect(scaled.total.calories).toBeCloseTo(summary.total.calories * 2, 0);
    expect(scaled.perServing.calories).toBe(summary.perServing.calories);
  });
});

