import { describe, it, expect } from "vitest";
import { simpleParseRecipe } from "../src/lib/uploader/parser";

describe("simpleParseRecipe", () => {
  it("parses sections with Ingredients and Instructions", () => {
    const text = `Chocolate Cake

Ingredients:
- 1 cup sugar
- 2 eggs

Instructions:
1. Mix ingredients
2. Bake at 350F for 30 minutes`;

    const parsed = simpleParseRecipe(text as unknown as string);
    expect(parsed.name).toBe("Chocolate Cake");
    expect(parsed.ingredients).toEqual(["1 cup sugar", "2 eggs"]);
    expect(parsed.instructions).toContain("Mix ingredients");
  });

  it("parses title and ingredient heuristics without sections", () => {
    const text = `Pancakes\n\n1 cup flour\n2 eggs\n3/4 cup milk\nMix and cook`;
    const parsed = simpleParseRecipe(text as unknown as string);
    expect(parsed.name).toBe("Pancakes");
    expect(parsed.ingredients.length).toBeGreaterThanOrEqual(1);
    expect(parsed.instructions).toContain("Mix");
  });

  it("handles bullets and numbered instructions", () => {
    const text = `Omelette\n\n- 2 eggs\n- salt\n\nDirections:\n1) Beat eggs\n2) Cook on skillet`;
    const parsed = simpleParseRecipe(text as unknown as string);
    expect(parsed.name).toBe("Omelette");
    expect(parsed.ingredients).toEqual(["2 eggs", "salt"]);
    expect(parsed.instructions).toContain("Beat eggs");
  });
});
