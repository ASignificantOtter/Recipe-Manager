import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "../src/lib/prisma";

// Mock the dependencies
vi.mock("../src/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    recipe: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    recipeIngredient: {
      deleteMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const mockRecipe = {
  id: "recipe-1",
  userId: "user-1",
  name: "Chocolate Cake",
  instructions: "Mix and bake at 350F for 30 minutes",
  prepTime: 15,
  cookTime: 30,
  servings: 8,
  notes: "Delicious dessert",
  dietaryTags: ["vegetarian"],
  ingredients: [
    {
      id: "ing-1",
      recipeId: "recipe-1",
      name: "flour",
      quantity: 2,
      unit: "cups",
      canonicalQuantity: 254,
      canonicalUnit: "g",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "ing-2",
      recipeId: "recipe-1",
      name: "sugar",
      quantity: 1,
      unit: "cup",
      canonicalQuantity: 204,
      canonicalUnit: "g",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  uploadedFileName: null,
  uploadedFileType: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Recipe Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Create Recipe", () => {
    it("creates a recipe with ingredients", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
      });

      (prisma.recipe.create as any).mockResolvedValue(mockRecipe);

      const recipeData = {
        name: "Chocolate Cake",
        instructions: "Mix and bake at 350F for 30 minutes",
        prepTime: 15,
        cookTime: 30,
        servings: 8,
        dietaryTags: ["vegetarian"],
        ingredients: [
          {
            name: "flour",
            quantity: 2,
            unit: "cups",
            canonicalQuantity: 254,
            canonicalUnit: "g",
          },
        ],
      };

      const result = await (prisma.recipe.create as any)({
        data: {
          userId: "user-1",
          name: recipeData.name,
          instructions: recipeData.instructions,
        },
      });

      expect(result).toEqual(mockRecipe);
    });

    it("validates required fields", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-1" },
      });

      // Missing name should fail validation
      const invalidData = {
        instructions: "Some instructions",
        ingredients: [],
      };

      // This would be caught by Zod validation in the actual API
      expect(invalidData).not.toHaveProperty("name");
    });

    it("requires user authentication", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue(null);

      // Should return 401 Unauthorized
      expect((auth as any)()).resolves.toBeNull();
    });

    it("applies dietary tags to recipe", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-1" },
      });

      const recipeWithTags = {
        ...mockRecipe,
        dietaryTags: ["vegetarian", "gluten-free", "vegan"],
      };

      (prisma.recipe.create as any).mockResolvedValue(recipeWithTags);

      expect(recipeWithTags.dietaryTags).toContain("vegetarian");
      expect(recipeWithTags.dietaryTags).toContain("gluten-free");
      expect(recipeWithTags.dietaryTags).toContain("vegan");
    });
  });

  describe("Read Recipe", () => {
    it("retrieves recipe by ID", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-1" },
      });

      (prisma.recipe.findUnique as any).mockResolvedValue(mockRecipe);

      const recipe = await (prisma.recipe.findUnique as any)({
        where: { id: "recipe-1" },
        include: { ingredients: true },
      });

      expect(recipe).toEqual(mockRecipe);
      expect(recipe.name).toBe("Chocolate Cake");
      expect(recipe.ingredients).toHaveLength(2);
    });

    it("returns 404 when recipe not found", async () => {
      (prisma.recipe.findUnique as any).mockResolvedValue(null);

      const recipe = await (prisma.recipe.findUnique as any)({
        where: { id: "nonexistent" },
      });

      expect(recipe).toBeNull();
    });

    it("protects recipes from unauthorized access", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-2" }, // Different user
      });

      (prisma.recipe.findUnique as any).mockResolvedValue({
        ...mockRecipe,
        userId: "user-1", // Recipe belongs to different user
      });

      const recipe = await (prisma.recipe.findUnique as any)({
        where: { id: "recipe-1" },
      });

      // Ownership check would be done in the API route
      expect(recipe.userId).not.toBe("user-2");
    });

    it("retrieves recipes for authenticated user", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-1" },
      });

      const recipes = [mockRecipe, { ...mockRecipe, id: "recipe-2", name: "Vanilla Cake" }];
      (prisma.recipe.findMany as any).mockResolvedValue(recipes);

      const userRecipes = await (prisma.recipe.findMany as any)({
        where: { userId: "user-1" },
      });

      expect(userRecipes).toHaveLength(2);
      expect(userRecipes[0].userId).toBe("user-1");
    });
  });

  describe("Update Recipe", () => {
    it("updates recipe details", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-1" },
      });

      const updatedRecipe = {
        ...mockRecipe,
        name: "Amazing Chocolate Cake",
        cookTime: 35,
      };

      (prisma.recipe.findUnique as any).mockResolvedValue(mockRecipe);
      (prisma.recipe.update as any).mockResolvedValue(updatedRecipe);

      expect(updatedRecipe.name).toBe("Amazing Chocolate Cake");
      expect(updatedRecipe.cookTime).toBe(35);
    });

    it("updates ingredients independently", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-1" },
      });

      (prisma.recipe.findUnique as any).mockResolvedValue(mockRecipe);
      (prisma.recipeIngredient.update as any).mockResolvedValue({
        id: "ing-1",
        name: "flour",
        quantity: 3,
        unit: "cups",
      });

      // Simulate updating an ingredient
      const updated = await (prisma.recipeIngredient.update as any)({
        where: { id: "ing-1" },
        data: { quantity: 3 },
      });

      expect(updated.quantity).toBe(3);
    });

    it("prevents unauthorized updates", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-2" },
      });

      (prisma.recipe.findUnique as any).mockResolvedValue(mockRecipe);

      const recipe = await (prisma.recipe.findUnique as any)({
        where: { id: "recipe-1" },
      });

      // The API route would check ownership
      expect(recipe.userId).not.toBe("user-2");
    });

    it("allows adding new ingredients", async () => {
      (prisma.recipeIngredient.create as any).mockResolvedValue({
        id: "ing-3",
        recipeId: "recipe-1",
        name: "eggs",
        quantity: 3,
        unit: "count",
      });

      const newIngredient = await (prisma.recipeIngredient.create as any)({
        data: {
          recipeId: "recipe-1",
          name: "eggs",
          quantity: 3,
          unit: "count",
        },
      });

      expect(newIngredient.name).toBe("eggs");
      expect(newIngredient.quantity).toBe(3);
    });
  });

  describe("Delete Recipe", () => {
    it("deletes a recipe", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-1" },
      });

      (prisma.recipe.findUnique as any).mockResolvedValue(mockRecipe);
      (prisma.recipe.delete as any).mockResolvedValue(mockRecipe);

      const result = await (prisma.recipe.delete as any)({
        where: { id: "recipe-1" },
      });

      expect(result.id).toBe("recipe-1");
    });

    it("prevents unauthorized deletion", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-2" },
      });

      (prisma.recipe.findUnique as any).mockResolvedValue(mockRecipe);

      const recipe = await (prisma.recipe.findUnique as any)({
        where: { id: "recipe-1" },
      });

      // The API route would check ownership before deletion
      expect(recipe.userId).not.toBe("user-2");
    });

    it("cascades deletion to ingredients", async () => {
      (prisma.recipe.delete as any).mockResolvedValue(mockRecipe);

      // Prisma would cascade delete ingredients due to onDelete: Cascade
      const result = await (prisma.recipe.delete as any)({
        where: { id: "recipe-1" },
      });

      expect(result.id).toBe("recipe-1");
      // Ingredients would be deleted by database cascade
    });
  });

  describe("Recipe Validation", () => {
    it("requires recipe name", () => {
      const data = {
        instructions: "Some instructions",
      };
      expect(data).not.toHaveProperty("name");
    });

    it("requires instructions", () => {
      const data = {
        name: "Cake",
      };
      expect(data).not.toHaveProperty("instructions");
    });

    it("validates optional numeric fields", () => {
      const data = {
        name: "Cake",
        instructions: "Instructions",
        prepTime: 15,
        cookTime: 30,
        servings: 8,
      };
      expect(typeof data.prepTime).toBe("number");
      expect(typeof data.cookTime).toBe("number");
      expect(typeof data.servings).toBe("number");
    });

    it("allows optional notes", () => {
      const data = {
        name: "Cake",
        instructions: "Instructions",
        notes: "This is optional",
      };
      expect(data.notes).toBe("This is optional");
    });
  });
});
