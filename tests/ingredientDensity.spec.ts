import { describe, it, expect } from "vitest";
import { getIngredientDensity, getSupportedDensityIngredients } from "../src/lib/uploader/ingredientDensity";

describe("ingredient density lookup", () => {
  it("resolves canonical ingredient names", () => {
    expect(getIngredientDensity("sugar")).toBeCloseTo(0.85, 2);
    expect(getIngredientDensity("olive oil")).toBeCloseTo(0.91, 2);
  });

  it("resolves common aliases", () => {
    expect(getIngredientDensity("extra virgin olive oil")).toBeCloseTo(0.91, 2);
    expect(getIngredientDensity("all-purpose flour")).toBeCloseTo(0.53, 2);
    expect(getIngredientDensity("active dry yeast")).toBeCloseTo(0.8, 2);
  });

  it("supports partial ingredient matches from parsed names", () => {
    expect(getIngredientDensity("1 chopped yellow onion")).toBeCloseTo(0.94, 2);
    expect(getIngredientDensity("2 cups diced tomatoes")).toBeCloseTo(0.95, 2);
  });

  it("returns undefined for unsupported ingredients", () => {
    expect(getIngredientDensity("dragon fruit")).toBeUndefined();
  });

  it("exposes the maintained canonical ingredient set", () => {
    expect(getSupportedDensityIngredients()).toContain("carrot");
    expect(getSupportedDensityIngredients()).toContain("baking powder");
  });
});
