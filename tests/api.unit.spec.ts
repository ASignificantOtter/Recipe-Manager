import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { z } from "zod";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "test-user-1" } })),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
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
    mealPlan: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    mealPlanDay: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    mealPlanRecipe: {
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { GET as getRecipes, POST as postRecipe } from "../src/app/api/recipes/route";
import {
  GET as getRecipe,
  PUT as putRecipe,
  DELETE as deleteRecipe,
} from "../src/app/api/recipes/[id]/route";
import { GET as getMealPlans, POST as postMealPlan } from "../src/app/api/meal-plans/route";
import {
  GET as getMealPlan,
  PUT as putMealPlan,
  DELETE as deleteMealPlan,
  PATCH as patchMealPlan,
} from "../src/app/api/meal-plans/[id]/route";
import { GET as getShoppingList } from "../src/app/api/meal-plans/[id]/shopping-list/route";
import { prisma } from "../src/lib/prisma";

describe("API Integration - Recipes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/recipes", () => {
    it("returns all recipes for authenticated user", async () => {
      const mockRecipes = [
        {
          id: "recipe-1",
          userId: "test-user-1",
          name: "Pasta",
          instructions: "Cook pasta",
          ingredients: [],
        },
      ];

      (prisma.recipe.findMany as any).mockResolvedValue(mockRecipes);

      const req = new NextRequest("http://localhost/api/recipes");
      const res = await getRecipes(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual(mockRecipes);
      expect(prisma.recipe.findMany).toHaveBeenCalledWith({
        where: { userId: "test-user-1" },
        include: { ingredients: true },
        orderBy: { createdAt: "desc" },
      });
    });

    it("requires authentication", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost/api/recipes");
      const res = await getRecipes(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });

    it("handles database errors", async () => {
      (prisma.recipe.findMany as any).mockRejectedValue(
        new Error("Database error")
      );

      const req = new NextRequest("http://localhost/api/recipes");
      const res = await getRecipes(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Internal server error");
    });
  });

  describe("POST /api/recipes", () => {
    it("creates a new recipe with valid data", async () => {
      const recipeData = {
        name: "Chocolate Cake",
        instructions: "Mix and bake",
        prepTime: 15,
        cookTime: 30,
        servings: 8,
        dietaryTags: ["vegetarian"],
        ingredients: [
          { name: "flour", quantity: 2, unit: "cups" },
          { name: "sugar", quantity: 1, unit: "cup" },
        ],
      };

      const mockCreatedRecipe = {
        id: "recipe-1",
        userId: "test-user-1",
        ...recipeData,
        ingredients: recipeData.ingredients.map((ing, i) => ({
          id: `ing-${i}`,
          recipeId: "recipe-1",
          ...ing,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.recipe.create as any).mockResolvedValue(mockCreatedRecipe);

      const req = new NextRequest("http://localhost/api/recipes", {
        method: "POST",
        body: JSON.stringify(recipeData),
      });
      const res = await postRecipe(req);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.name).toBe(recipeData.name);
      expect(body.ingredients).toHaveLength(2);
    });

    it("validates required fields", async () => {
      const invalidData = {
        instructions: "Mix and bake",
        // Missing name
      };

      const req = new NextRequest("http://localhost/api/recipes", {
        method: "POST",
        body: JSON.stringify(invalidData),
      });
      const res = await postRecipe(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBeTruthy();
    });

    it("validates ingredient structure", async () => {
      const invalidData = {
        name: "Recipe",
        instructions: "Cook",
        ingredients: [
          { name: "flour" }, // Missing quantity and unit
        ],
      };

      const req = new NextRequest("http://localhost/api/recipes", {
        method: "POST",
        body: JSON.stringify(invalidData),
      });
      const res = await postRecipe(req);
      const body = await res.json();

      expect(res.status).toBe(400);
    });

    it("handles malformed JSON", async () => {
      const req = new NextRequest("http://localhost/api/recipes", {
        method: "POST",
        body: "invalid json {",
      });
      const res = await postRecipe(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Internal server error");
    });
  });

  describe("GET /api/recipes/[id]", () => {
    it("returns recipe by id", async () => {
      const mockRecipe = {
        id: "recipe-1",
        userId: "test-user-1",
        name: "Pasta",
        instructions: "Cook",
        ingredients: [],
      };

      (prisma.recipe.findUnique as any).mockResolvedValue(mockRecipe);

      const res = await getRecipe(
        new NextRequest("http://localhost/api/recipes/recipe-1"),
        { params: Promise.resolve({ id: "recipe-1" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.id).toBe("recipe-1");
    });

    it("returns 404 for non-existent recipe", async () => {
      (prisma.recipe.findUnique as any).mockResolvedValue(null);

      const res = await getRecipe(
        new NextRequest("http://localhost/api/recipes/nonexistent"),
        { params: Promise.resolve({ id: "nonexistent" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe("Recipe not found");
    });

    it("prevents access to other users' recipes", async () => {
      const mockRecipe = {
        id: "recipe-1",
        userId: "other-user",
        name: "Pasta",
        instructions: "Cook",
      };

      (prisma.recipe.findUnique as any).mockResolvedValue(mockRecipe);

      const res = await getRecipe(
        new NextRequest("http://localhost/api/recipes/recipe-1"),
        { params: Promise.resolve({ id: "recipe-1" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("PUT /api/recipes/[id]", () => {
    it("updates recipe", async () => {
      const mockRecipe = {
        id: "recipe-1",
        userId: "test-user-1",
        name: "Old Name",
        instructions: "Old instructions",
      };

      const updateData = {
        name: "New Name",
        instructions: "New instructions",
      };

      const updatedRecipe = {
        id: "recipe-1",
        userId: "test-user-1",
        name: "New Name",
        instructions: "New instructions",
        ingredients: [],
      };

      (prisma.recipe.findUnique as any).mockResolvedValue(mockRecipe);
      (prisma.recipe.update as any).mockResolvedValue(updatedRecipe);

      const res = await putRecipe(
        new NextRequest("http://localhost/api/recipes/recipe-1", {
          method: "PUT",
          body: JSON.stringify(updateData),
        }),
        { params: Promise.resolve({ id: "recipe-1" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.name).toBe("New Name");
    });

    it("updates ingredients", async () => {
      const mockRecipe = {
        id: "recipe-1",
        userId: "test-user-1",
        name: "Recipe",
        instructions: "Cook",
      };

      const updateData = {
        ingredients: [
          { id: "ing-1", name: "flour", quantity: 3, unit: "cups" },
          { name: "sugar", quantity: 2, unit: "cups" }, // New ingredient
        ],
      };

      (prisma.recipe.findUnique as any).mockResolvedValue(mockRecipe);
      (prisma.recipe.update as any).mockResolvedValue({
        ...mockRecipe,
        ingredients: [],
      });
      (prisma.recipeIngredient.deleteMany as any).mockResolvedValue({});
      (prisma.recipeIngredient.update as any).mockResolvedValue({});
      (prisma.recipeIngredient.create as any).mockResolvedValue({});

      const res = await putRecipe(
        new NextRequest("http://localhost/api/recipes/recipe-1", {
          method: "PUT",
          body: JSON.stringify(updateData),
        }),
        { params: Promise.resolve({ id: "recipe-1" }) }
      );

      expect(res.status).toBe(200);
      expect(prisma.recipeIngredient.update).toHaveBeenCalled();
      expect(prisma.recipeIngredient.create).toHaveBeenCalled();
    });

    it("prevents unauthorized updates", async () => {
      const mockRecipe = {
        id: "recipe-1",
        userId: "other-user",
        name: "Recipe",
      };

      (prisma.recipe.findUnique as any).mockResolvedValue(mockRecipe);

      const res = await putRecipe(
        new NextRequest("http://localhost/api/recipes/recipe-1", {
          method: "PUT",
          body: JSON.stringify({ name: "Hacked" }),
        }),
        { params: Promise.resolve({ id: "recipe-1" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(prisma.recipe.update).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /api/recipes/[id]", () => {
    it("deletes recipe", async () => {
      const mockRecipe = {
        id: "recipe-1",
        userId: "test-user-1",
        name: "Recipe",
      };

      (prisma.recipe.findUnique as any).mockResolvedValue(mockRecipe);
      (prisma.recipe.delete as any).mockResolvedValue(mockRecipe);

      const res = await deleteRecipe(
        new NextRequest("http://localhost/api/recipes/recipe-1", {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: "recipe-1" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(prisma.recipe.delete).toHaveBeenCalledWith({
        where: { id: "recipe-1" },
      });
    });

    it("prevents unauthorized deletion", async () => {
      const mockRecipe = {
        id: "recipe-1",
        userId: "other-user",
        name: "Recipe",
      };

      (prisma.recipe.findUnique as any).mockResolvedValue(mockRecipe);

      const res = await deleteRecipe(
        new NextRequest("http://localhost/api/recipes/recipe-1", {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: "recipe-1" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(prisma.recipe.delete).not.toHaveBeenCalled();
    });
  });
});

describe("API Integration - Meal Plans", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/meal-plans", () => {
    it("returns all meal plans for user", async () => {
      const startDate = new Date("2026-02-13T04:27:22.800Z");
      const endDate = new Date("2026-02-13T04:27:22.800Z");
      
      const mockMealPlans = [
        {
          id: "plan-1",
          userId: "test-user-1",
          name: "Weekly Plan",
          startDate,
          endDate,
          days: [],
        },
      ];

      (prisma.mealPlan.findMany as any).mockResolvedValue(mockMealPlans);

      const req = new NextRequest("http://localhost/api/meal-plans");
      const res = await getMealPlans(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      // JSON serialization converts Date to ISO strings
      expect(body).toMatchObject([
        {
          id: "plan-1",
          userId: "test-user-1",
          name: "Weekly Plan",
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          days: [],
        },
      ]);
    });
  });

  describe("POST /api/meal-plans", () => {
    it("creates meal plan with days", async () => {
      const planData = {
        name: "Weekly Plan",
        description: "Healthy meals",
        startDate: "2026-02-15T00:00:00Z",
        endDate: "2026-02-21T00:00:00Z",
      };

      const mockCreatedPlan = {
        id: "plan-1",
        userId: "test-user-1",
        ...planData,
        startDate: new Date(planData.startDate),
        endDate: new Date(planData.endDate),
        days: [
          { id: "day-1", dayOfWeek: "monday", recipes: [] },
          { id: "day-2", dayOfWeek: "tuesday", recipes: [] },
          { id: "day-3", dayOfWeek: "wednesday", recipes: [] },
          { id: "day-4", dayOfWeek: "thursday", recipes: [] },
          { id: "day-5", dayOfWeek: "friday", recipes: [] },
          { id: "day-6", dayOfWeek: "saturday", recipes: [] },
          { id: "day-7", dayOfWeek: "sunday", recipes: [] },
        ],
      };

      (prisma.mealPlan.create as any).mockResolvedValue(mockCreatedPlan);

      const req = new NextRequest("http://localhost/api/meal-plans", {
        method: "POST",
        body: JSON.stringify(planData),
      });
      const res = await postMealPlan(req);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.name).toBe(planData.name);
      expect(body.days).toHaveLength(7);
    });

    it("validates date format", async () => {
      const invalidData = {
        name: "Plan",
        startDate: "invalid-date",
        endDate: "2026-02-21T00:00:00Z",
      };

      const req = new NextRequest("http://localhost/api/meal-plans", {
        method: "POST",
        body: JSON.stringify(invalidData),
      });
      const res = await postMealPlan(req);
      const body = await res.json();

      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/meal-plans/[id]", () => {
    it("adds recipe to meal plan", async () => {
      const mockMealPlan = {
        id: "plan-1",
        userId: "test-user-1",
        name: "Plan",
      };

      const mockDay = {
        id: "day-1",
        mealPlanId: "plan-1",
        dayOfWeek: "monday",
      };

      const mockMealPlanRecipe = {
        id: "mp-recipe-1",
        mealPlanDayId: "day-1",
        recipeId: "recipe-1",
        serveCount: 2,
        recipe: { id: "recipe-1", name: "Pasta" },
      };

      (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlan);
      (prisma.mealPlanDay.findFirst as any).mockResolvedValue(mockDay);
      (prisma.mealPlanRecipe.create as any).mockResolvedValue(mockMealPlanRecipe);

      const req = new NextRequest("http://localhost/api/meal-plans/plan-1", {
        method: "PATCH",
        body: JSON.stringify({
          action: "addRecipe",
          dayOfWeek: "monday",
          recipeId: "recipe-1",
          serveCount: 2,
        }),
      });
      const res = await patchMealPlan(req, {
        params: Promise.resolve({ id: "plan-1" }),
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.recipeId).toBe("recipe-1");
    });

    it("removes recipe from meal plan", async () => {
      const mockMealPlan = {
        id: "plan-1",
        userId: "test-user-1",
        name: "Plan",
      };

      (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlan);
      (prisma.mealPlanRecipe.delete as any).mockResolvedValue({});

      const req = new NextRequest("http://localhost/api/meal-plans/plan-1", {
        method: "PATCH",
        body: JSON.stringify({
          action: "removeRecipe",
          recipeId: "mp-recipe-1",
        }),
      });
      const res = await patchMealPlan(req, {
        params: Promise.resolve({ id: "plan-1" }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it("rejects invalid action", async () => {
      const mockMealPlan = {
        id: "plan-1",
        userId: "test-user-1",
        name: "Plan",
      };

      (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlan);

      const req = new NextRequest("http://localhost/api/meal-plans/plan-1", {
        method: "PATCH",
        body: JSON.stringify({
          action: "invalidAction",
        }),
      });
      const res = await patchMealPlan(req, {
        params: Promise.resolve({ id: "plan-1" }),
      });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("Invalid action");
    });
  });

  describe("GET /api/meal-plans/[id]/shopping-list", () => {
    it("generates shopping list", async () => {
      const mockMealPlan = {
        id: "plan-1",
        userId: "test-user-1",
        name: "Weekly Plan",
        days: [
          {
            id: "day-1",
            recipes: [
              {
                id: "mp-recipe-1",
                serveCount: 2,
                recipe: {
                  id: "recipe-1",
                  ingredients: [
                    { name: "pasta", quantity: 1, unit: "lb" },
                    { name: "sauce", quantity: 2, unit: "cups" },
                  ],
                },
              },
            ],
          },
        ],
      };

      (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlan);

      const res = await getShoppingList(
        new NextRequest("http://localhost/api/meal-plans/plan-1/shopping-list"),
        { params: Promise.resolve({ id: "plan-1" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.mealPlanId).toBe("plan-1");
      expect(body.shoppingList).toBeDefined();
      expect(body.totalItems).toBeGreaterThan(0);
    });

    it("aggregates duplicate ingredients", async () => {
      const mockMealPlan = {
        id: "plan-1",
        userId: "test-user-1",
        name: "Plan",
        days: [
          {
            id: "day-1",
            recipes: [
              {
                id: "mp-recipe-1",
                serveCount: 1,
                recipe: {
                  id: "recipe-1",
                  ingredients: [{ name: "pasta", quantity: 1, unit: "lb" }],
                },
              },
            ],
          },
          {
            id: "day-2",
            recipes: [
              {
                id: "mp-recipe-2",
                serveCount: 1,
                recipe: {
                  id: "recipe-2",
                  ingredients: [{ name: "pasta", quantity: 2, unit: "lb" }],
                },
              },
            ],
          },
        ],
      };

      (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlan);

      const res = await getShoppingList(
        new NextRequest("http://localhost/api/meal-plans/plan-1/shopping-list"),
        { params: Promise.resolve({ id: "plan-1" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      const pastaItem = body.shoppingList.find(
        (item: any) => item.name === "pasta"
      );
      expect(pastaItem.quantity).toBe(3); // 1 + 2
    });

    it("prevents unauthorized access", async () => {
      const mockMealPlan = {
        id: "plan-1",
        userId: "other-user",
        name: "Plan",
      };

      (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlan);

      const res = await getShoppingList(
        new NextRequest("http://localhost/api/meal-plans/plan-1/shopping-list"),
        { params: Promise.resolve({ id: "plan-1" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(401);
    });
  });
});
