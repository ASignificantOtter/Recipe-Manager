import { describe, it, expect } from "vitest";
import { parseIngredient } from "../src/lib/uploader/ingredientParser";

describe("parseIngredient", () => {
  it("parses simple quantity and unit", () => {
    const p = parseIngredient("1 cup sugar");
    expect(p.quantity).toBe(1);
    expect(p.unit).toBe("cup");
    expect(p.name).toBe("sugar");
  });

  it("parses integer quantity without unit", () => {
    const p = parseIngredient("2 eggs");
    expect(p.quantity).toBe(2);
    expect(p.unit).toBe("");
    expect(p.name).toBe("eggs");
  });

  it("parses mixed fraction quantities", () => {
    const p = parseIngredient("1 1/2 cups milk");
    expect(p.quantity).toBeCloseTo(1.5);
    expect(p.unit).toBe("cups");
    expect(p.name).toBe("milk");
  });

  it("parses simple fraction quantities", () => {
    const p = parseIngredient("1/4 tsp pepper");
    expect(p.quantity).toBeCloseTo(0.25);
    expect(p.unit).toBe("tsp");
    expect(p.name).toBe("pepper");
  });

  it("handles notes after comma or parentheses", () => {
    const p = parseIngredient("2 cloves garlic, minced");
    expect(p.name).toBe("garlic");
    expect(p.notes).toBe("minced");
  });
});
