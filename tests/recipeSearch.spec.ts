import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  buildRecipeWhereClause,
  buildRecipesQueryString,
} from "../src/lib/utils/recipeFilters";

// ---------------------------------------------------------------------------
// Mock auth and prisma for API-level tests
// ---------------------------------------------------------------------------
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "test-user-1" } })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    recipe: {
      findMany: vi.fn(),
    },
  },
}));

import { GET as getRecipes } from "../src/app/api/recipes/route";
import { prisma } from "../src/lib/prisma";

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------
const makeRecipe = (overrides: Partial<{
  id: string;
  name: string;
  prepTime: number | null;
  cookTime: number | null;
  dietaryTags: string[];
}> = {}) => ({
  id: "recipe-1",
  userId: "test-user-1",
  name: "Chocolate Cake",
  instructions: "Mix and bake at 350F for 30 minutes",
  prepTime: 15,
  cookTime: 30,
  servings: 8,
  notes: null,
  dietaryTags: ["vegetarian"],
  ingredients: [],
  uploadedFileName: null,
  uploadedFileType: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// Unit tests: buildRecipeWhereClause
// ---------------------------------------------------------------------------
describe("buildRecipeWhereClause", () => {
  it("returns only userId when no filters are provided", () => {
    const where = buildRecipeWhereClause("user-1");
    expect(where).toEqual({ userId: "user-1" });
  });

  it("returns only userId when filters object is empty", () => {
    const where = buildRecipeWhereClause("user-1", {});
    expect(where).toEqual({ userId: "user-1" });
  });

  it("adds case-insensitive name search when search is provided", () => {
    const where = buildRecipeWhereClause("user-1", { search: "pasta" });
    expect(where).toMatchObject({
      userId: "user-1",
      name: { contains: "pasta", mode: "insensitive" },
    });
  });

  it("trims whitespace from the search term", () => {
    const where = buildRecipeWhereClause("user-1", { search: "  soup  " });
    expect(where).toMatchObject({
      name: { contains: "soup", mode: "insensitive" },
    });
  });

  it("ignores blank search string", () => {
    const where = buildRecipeWhereClause("user-1", { search: "   " });
    expect(where).not.toHaveProperty("name");
  });

  it("adds hasEvery tag filter when tags are provided", () => {
    const where = buildRecipeWhereClause("user-1", { tags: ["vegan"] });
    expect(where).toMatchObject({
      dietaryTags: { hasEvery: ["vegan"] },
    });
  });

  it("adds hasEvery filter for multiple tags", () => {
    const where = buildRecipeWhereClause("user-1", {
      tags: ["vegan", "gluten-free"],
    });
    expect(where).toMatchObject({
      dietaryTags: { hasEvery: ["vegan", "gluten-free"] },
    });
  });

  it("ignores empty tags array", () => {
    const where = buildRecipeWhereClause("user-1", { tags: [] });
    expect(where).not.toHaveProperty("dietaryTags");
  });

  it("adds lte prepTime filter when maxPrepTime is provided", () => {
    const where = buildRecipeWhereClause("user-1", { maxPrepTime: 30 });
    expect(where).toMatchObject({ prepTime: { lte: 30 } });
  });

  it("adds lte cookTime filter when maxCookTime is provided", () => {
    const where = buildRecipeWhereClause("user-1", { maxCookTime: 60 });
    expect(where).toMatchObject({ cookTime: { lte: 60 } });
  });

  it("ignores NaN maxPrepTime", () => {
    const where = buildRecipeWhereClause("user-1", { maxPrepTime: NaN });
    expect(where).not.toHaveProperty("prepTime");
  });

  it("ignores NaN maxCookTime", () => {
    const where = buildRecipeWhereClause("user-1", { maxCookTime: NaN });
    expect(where).not.toHaveProperty("cookTime");
  });

  it("combines all filters at once", () => {
    const where = buildRecipeWhereClause("user-1", {
      search: "cake",
      tags: ["vegetarian"],
      maxPrepTime: 20,
      maxCookTime: 45,
    });
    expect(where).toEqual({
      userId: "user-1",
      name: { contains: "cake", mode: "insensitive" },
      dietaryTags: { hasEvery: ["vegetarian"] },
      prepTime: { lte: 20 },
      cookTime: { lte: 45 },
    });
  });
});

// ---------------------------------------------------------------------------
// Unit tests: buildRecipesQueryString
// ---------------------------------------------------------------------------
describe("buildRecipesQueryString", () => {
  it("returns base URL when no filters are active", () => {
    expect(buildRecipesQueryString({})).toBe("/api/recipes");
  });

  it("appends search param", () => {
    const url = buildRecipesQueryString({ search: "pasta" });
    expect(url).toBe("/api/recipes?search=pasta");
  });

  it("trims and encodes the search term in the URL", () => {
    const url = buildRecipesQueryString({ search: "  my cake  " });
    expect(url).toContain("search=my+cake");
  });

  it("appends a single tag param", () => {
    const url = buildRecipesQueryString({ tags: ["vegan"] });
    expect(url).toContain("tags=vegan");
  });

  it("appends multiple tag params", () => {
    const url = buildRecipesQueryString({ tags: ["vegan", "gluten-free"] });
    expect(url).toContain("tags=vegan");
    expect(url).toContain("tags=gluten-free");
  });

  it("skips empty tag strings", () => {
    const url = buildRecipesQueryString({ tags: ["", "vegan", ""] });
    expect(url).toContain("tags=vegan");
    expect(url).not.toContain("tags=&");
  });

  it("appends maxPrepTime param", () => {
    const url = buildRecipesQueryString({ maxPrepTime: 30 });
    expect(url).toContain("maxPrepTime=30");
  });

  it("appends maxCookTime param", () => {
    const url = buildRecipesQueryString({ maxCookTime: 60 });
    expect(url).toContain("maxCookTime=60");
  });

  it("builds full query string with all filters", () => {
    const url = buildRecipesQueryString({
      search: "soup",
      tags: ["vegan"],
      maxPrepTime: 15,
      maxCookTime: 30,
    });
    expect(url).toContain("search=soup");
    expect(url).toContain("tags=vegan");
    expect(url).toContain("maxPrepTime=15");
    expect(url).toContain("maxCookTime=30");
  });

  it("returns base URL when maxPrepTime is NaN", () => {
    expect(buildRecipesQueryString({ maxPrepTime: NaN })).toBe("/api/recipes");
  });

  it("returns base URL when maxCookTime is NaN", () => {
    expect(buildRecipesQueryString({ maxCookTime: NaN })).toBe("/api/recipes");
  });

  it("omits undefined optional fields", () => {
    const url = buildRecipesQueryString({ search: "cake" });
    expect(url).not.toContain("tags=");
    expect(url).not.toContain("maxPrepTime=");
    expect(url).not.toContain("maxCookTime=");
  });

  it("returns base URL when search is only whitespace", () => {
    expect(buildRecipesQueryString({ search: "   " })).toBe("/api/recipes");
  });

  it("returns base URL for empty tags array", () => {
    expect(buildRecipesQueryString({ tags: [] })).toBe("/api/recipes");
  });
});

// ---------------------------------------------------------------------------
// Integration tests: GET /api/recipes with filter query params
// ---------------------------------------------------------------------------
describe("GET /api/recipes – search & filter integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all recipes when no query params are given", async () => {
    const mockRecipes = [makeRecipe()];
    (prisma.recipe.findMany as any).mockResolvedValue(mockRecipes);

    const req = new NextRequest("http://localhost/api/recipes");
    const res = await getRecipes(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("recipe-1");
    expect(prisma.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "test-user-1" },
      })
    );
  });

  it("passes search filter to prisma findMany", async () => {
    const mockRecipes = [makeRecipe({ name: "Pasta Carbonara" })];
    (prisma.recipe.findMany as any).mockResolvedValue(mockRecipes);

    const req = new NextRequest(
      "http://localhost/api/recipes?search=pasta"
    );
    const res = await getRecipes(req);

    expect(res.status).toBe(200);
    expect(prisma.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "test-user-1",
          name: { contains: "pasta", mode: "insensitive" },
        }),
      })
    );
  });

  it("passes tags filter to prisma findMany", async () => {
    const mockRecipes = [makeRecipe({ dietaryTags: ["vegan"] })];
    (prisma.recipe.findMany as any).mockResolvedValue(mockRecipes);

    const req = new NextRequest(
      "http://localhost/api/recipes?tags=vegan"
    );
    const res = await getRecipes(req);

    expect(res.status).toBe(200);
    expect(prisma.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dietaryTags: { hasEvery: ["vegan"] },
        }),
      })
    );
  });

  it("passes multiple tags to prisma findMany", async () => {
    const mockRecipes = [makeRecipe({ dietaryTags: ["vegan", "gluten-free"] })];
    (prisma.recipe.findMany as any).mockResolvedValue(mockRecipes);

    const req = new NextRequest(
      "http://localhost/api/recipes?tags=vegan&tags=gluten-free"
    );
    const res = await getRecipes(req);

    expect(res.status).toBe(200);
    expect(prisma.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dietaryTags: { hasEvery: ["vegan", "gluten-free"] },
        }),
      })
    );
  });

  it("passes maxPrepTime filter to prisma findMany", async () => {
    const mockRecipes = [makeRecipe({ prepTime: 10 })];
    (prisma.recipe.findMany as any).mockResolvedValue(mockRecipes);

    const req = new NextRequest(
      "http://localhost/api/recipes?maxPrepTime=30"
    );
    const res = await getRecipes(req);

    expect(res.status).toBe(200);
    expect(prisma.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          prepTime: { lte: 30 },
        }),
      })
    );
  });

  it("passes maxCookTime filter to prisma findMany", async () => {
    const mockRecipes = [makeRecipe({ cookTime: 20 })];
    (prisma.recipe.findMany as any).mockResolvedValue(mockRecipes);

    const req = new NextRequest(
      "http://localhost/api/recipes?maxCookTime=60"
    );
    const res = await getRecipes(req);

    expect(res.status).toBe(200);
    expect(prisma.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          cookTime: { lte: 60 },
        }),
      })
    );
  });

  it("combines search, tags, and time filters", async () => {
    const mockRecipes = [makeRecipe()];
    (prisma.recipe.findMany as any).mockResolvedValue(mockRecipes);

    const req = new NextRequest(
      "http://localhost/api/recipes?search=cake&tags=vegetarian&maxPrepTime=20&maxCookTime=45"
    );
    const res = await getRecipes(req);

    expect(res.status).toBe(200);
    expect(prisma.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "test-user-1",
          name: { contains: "cake", mode: "insensitive" },
          dietaryTags: { hasEvery: ["vegetarian"] },
          prepTime: { lte: 20 },
          cookTime: { lte: 45 },
        },
      })
    );
  });

  it("returns an empty array when no recipes match the filters", async () => {
    (prisma.recipe.findMany as any).mockResolvedValue([]);

    const req = new NextRequest(
      "http://localhost/api/recipes?search=nonexistent"
    );
    const res = await getRecipes(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual([]);
  });

  it("requires authentication", async () => {
    const { auth } = await import("@/lib/auth");
    (auth as any).mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost/api/recipes?search=cake");
    const res = await getRecipes(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 500 on unexpected database error", async () => {
    (prisma.recipe.findMany as any).mockRejectedValue(
      new Error("Database connection failed")
    );

    const req = new NextRequest("http://localhost/api/recipes?search=cake");
    const res = await getRecipes(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Internal server error");
  });

  it("ignores a blank search param and returns all recipes", async () => {
    const mockRecipes = [makeRecipe(), makeRecipe({ id: "recipe-2", name: "Soup" })];
    (prisma.recipe.findMany as any).mockResolvedValue(mockRecipes);

    const req = new NextRequest("http://localhost/api/recipes?search=");
    const res = await getRecipes(req);

    expect(res.status).toBe(200);
    // No name filter should have been added
    expect(prisma.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "test-user-1" },
      })
    );
  });
});
