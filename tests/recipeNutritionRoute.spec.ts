import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("../src/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    recipe: {
      findUnique: vi.fn(),
    },
    sharedRecipe: {
      findUnique: vi.fn(),
    },
  },
}));

import { GET } from "../src/app/api/recipes/[id]/nutrition/route";
import { prisma } from "../src/lib/prisma";

describe("GET /api/recipes/[id]/nutrition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns nutrition summary with scaled totals", async () => {
    const { auth } = await import("../src/lib/auth");
    (auth as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue({
      user: { id: "user-1" },
    });

    (prisma.recipe.findUnique as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue({
      id: "recipe-1",
      userId: "user-1",
      isPublic: false,
      servings: 2,
      ingredients: [{ name: "rice", quantity: 200, unit: "g" }],
    });

    const request = new NextRequest(
      "http://localhost/api/recipes/recipe-1/nutrition?targetServings=4"
    );
    const response = await GET(request, { params: Promise.resolve({ id: "recipe-1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.nutrition.total.calories).toBeGreaterThan(0);
    expect(body.scaled.targetServings).toBe(4);
  });

  it("returns partial data when ingredient is unmatched", async () => {
    const { auth } = await import("../src/lib/auth");
    (auth as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue({
      user: { id: "user-1" },
    });

    (prisma.recipe.findUnique as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue({
      id: "recipe-1",
      userId: "user-1",
      isPublic: false,
      servings: 1,
      ingredients: [{ name: "mystery ingredient", quantity: 1, unit: "cup" }],
    });

    const response = await GET(
      new NextRequest("http://localhost/api/recipes/recipe-1/nutrition"),
      { params: Promise.resolve({ id: "recipe-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.nutrition.unmatchedIngredients).toContain("mystery ingredient");
  });

  it("returns 401 when not authenticated", async () => {
    const { auth } = await import("../src/lib/auth");
    (auth as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue(null);

    const response = await GET(
      new NextRequest("http://localhost/api/recipes/recipe-1/nutrition"),
      { params: Promise.resolve({ id: "recipe-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });
});

