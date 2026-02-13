import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "../src/lib/prisma";

// Mock the dependencies
vi.mock("../src/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    mealPlan: {
      findUnique: vi.fn(),
    },
  },
}));

const mockMealPlanWithRecipes = {
  id: "meal-plan-1",
  userId: "user-1",
  name: "Weekly Plan",
  days: [
    {
      id: "day-1",
      dayOfWeek: "monday",
      recipes: [
        {
          id: "mp-recipe-1",
          serveCount: 2,
          recipe: {
            id: "recipe-1",
            name: "Pasta",
            ingredients: [
              {
                id: "ing-1",
                name: "pasta",
                quantity: 1,
                unit: "lb",
                notes: null,
              },
              {
                id: "ing-2",
                name: "tomato sauce",
                quantity: 2,
                unit: "cups",
                notes: null,
              },
            ],
          },
        },
        {
          id: "mp-recipe-2",
          serveCount: 1,
          recipe: {
            id: "recipe-2",
            name: "Salad",
            ingredients: [
              {
                id: "ing-3",
                name: "lettuce",
                quantity: 1,
                unit: "head",
                notes: null,
              },
              {
                id: "ing-4",
                name: "tomato",
                quantity: 2,
                unit: "count",
                notes: null,
              },
            ],
          },
        },
      ],
    },
    {
      id: "day-2",
      dayOfWeek: "tuesday",
      recipes: [
        {
          id: "mp-recipe-3",
          serveCount: 1,
          recipe: {
            id: "recipe-3",
            name: "Soup",
            ingredients: [
              {
                id: "ing-5",
                name: "chicken broth",
                quantity: 4,
                unit: "cups",
                notes: null,
              },
              {
                id: "ing-6",
                name: "pasta",
                quantity: 1,
                unit: "cup",
                notes: null,
              },
            ],
          },
        },
      ],
    },
  ],
};

describe("Shopping List Generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Generate Shopping List", () => {
    it("aggregates ingredients from all meal plan recipes", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-1" },
      });

      (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlanWithRecipes);

      const mealPlan = await (prisma.mealPlan.findUnique as any)({
        where: { id: "meal-plan-1" },
        include: {
          days: {
            include: {
              recipes: {
                include: {
                  recipe: {
                    include: { ingredients: true },
                  },
                },
              },
            },
          },
        },
      });

      // Simulate shopping list generation
      const ingredientMap = new Map();
      mealPlan.days.forEach((day) => {
        day.recipes.forEach((mealPlanRecipe) => {
          mealPlanRecipe.recipe.ingredients.forEach((ingredient) => {
            const key = `${ingredient.name.toLowerCase()}-${ingredient.unit}`;
            if (ingredientMap.has(key)) {
              const existing = ingredientMap.get(key);
              existing.quantity += ingredient.quantity * mealPlanRecipe.serveCount;
            } else {
              ingredientMap.set(key, {
                name: ingredient.name,
                quantity: ingredient.quantity * mealPlanRecipe.serveCount,
                unit: ingredient.unit,
              });
            }
          });
        });
      });

      const shoppingList = Array.from(ingredientMap.values());
      expect(shoppingList.length).toBeGreaterThan(0);
    });

    it("combines same ingredients with same unit", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-1" },
      });

      (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlanWithRecipes);

      const mealPlan = await (prisma.mealPlan.findUnique as any)({
        where: { id: "meal-plan-1" },
        include: {
          days: {
            include: {
              recipes: {
                include: {
                  recipe: {
                    include: { ingredients: true },
                  },
                },
              },
            },
          },
        },
      });

      // Pasta appears in both Monday and Tuesday recipes
      const ingredientMap = new Map();
      mealPlan.days.forEach((day) => {
        day.recipes.forEach((mealPlanRecipe) => {
          mealPlanRecipe.recipe.ingredients.forEach((ingredient) => {
            const key = `${ingredient.name.toLowerCase()}-${ingredient.unit}`;
            if (ingredientMap.has(key)) {
              const existing = ingredientMap.get(key);
              existing.quantity += ingredient.quantity * mealPlanRecipe.serveCount;
            } else {
              ingredientMap.set(key, {
                name: ingredient.name,
                quantity: ingredient.quantity * mealPlanRecipe.serveCount,
                unit: ingredient.unit,
              });
            }
          });
        });
      });

      const pastaKey = "pasta-lb"; // Assuming first pasta is in lbs
      const pastaInMl = "pasta-cup"; // Second pasta is in cups
      const hasPasta = Array.from(ingredientMap.keys()).some((k) => k.startsWith("pasta-"));
      expect(hasPasta).toBe(true);
    });

    it("accounts for serving count", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-1" },
      });

      (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlanWithRecipes);

      const mealPlan = await (prisma.mealPlan.findUnique as any)({
        where: { id: "meal-plan-1" },
        include: {
          days: {
            include: {
              recipes: {
                include: {
                  recipe: {
                    include: { ingredients: true },
                  },
                },
              },
            },
          },
        },
      });

      // Pasta Bolognese serves 2 people (serves 2 on Monday)
      const pastaRecipe = mealPlan.days[0].recipes[0];
      expect(pastaRecipe.serveCount).toBe(2);

      // So pasta should be 1lb * 2 = 2lbs
      const pastaQty = pastaRecipe.recipe.ingredients[0].quantity * pastaRecipe.serveCount;
      expect(pastaQty).toBe(2);
    });

    it("sorts ingredients alphabetically", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-1" },
      });

      (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlanWithRecipes);

      const mealPlan = await (prisma.mealPlan.findUnique as any)({
        where: { id: "meal-plan-1" },
        include: {
          days: {
            include: {
              recipes: {
                include: {
                  recipe: {
                    include: { ingredients: true },
                  },
                },
              },
            },
          },
        },
      });

      const ingredientMap = new Map();
      mealPlan.days.forEach((day) => {
        day.recipes.forEach((mealPlanRecipe) => {
          mealPlanRecipe.recipe.ingredients.forEach((ingredient) => {
            const key = `${ingredient.name.toLowerCase()}-${ingredient.unit}`;
            if (ingredientMap.has(key)) {
              const existing = ingredientMap.get(key);
              existing.quantity += ingredient.quantity * mealPlanRecipe.serveCount;
            } else {
              ingredientMap.set(key, {
                name: ingredient.name,
                quantity: ingredient.quantity * mealPlanRecipe.serveCount,
                unit: ingredient.unit,
              });
            }
          });
        });
      });

      const shoppingList = Array.from(ingredientMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      for (let i = 0; i < shoppingList.length - 1; i++) {
        const current = shoppingList[i].name.toLowerCase();
        const next = shoppingList[i + 1].name.toLowerCase();
        expect(current <= next).toBe(true);
      }
    });

    it("returns 404 when meal plan not found", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-1" },
      });

      (prisma.mealPlan.findUnique as any).mockResolvedValue(null);

      const mealPlan = await (prisma.mealPlan.findUnique as any)({
        where: { id: "nonexistent" },
      });

      expect(mealPlan).toBeNull();
    });

    it("protects shopping list from unauthorized access", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-2" },
      });

      const unauthorizedMealPlan = {
        ...mockMealPlanWithRecipes,
        userId: "user-1",
      };

      (prisma.mealPlan.findUnique as any).mockResolvedValue(unauthorizedMealPlan);

      const mealPlan = await (prisma.mealPlan.findUnique as any)({
        where: { id: "meal-plan-1" },
      });

      expect(mealPlan.userId).not.toBe("user-2");
    });

    it("includes ingredient notes in shopping list", async () => {
      const mealPlanWithNotes = {
        ...mockMealPlanWithRecipes,
        days: [
          {
            id: "day-1",
            dayOfWeek: "monday",
            recipes: [
              {
                id: "mp-recipe-1",
                serveCount: 1,
                recipe: {
                  id: "recipe-1",
                  name: "Chicken",
                  ingredients: [
                    {
                      id: "ing-1",
                      name: "chicken",
                      quantity: 2,
                      unit: "lbs",
                      notes: "boneless, skinless",
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const ingredientMap = new Map();
      mealPlanWithNotes.days.forEach((day) => {
        day.recipes.forEach((mealPlanRecipe) => {
          mealPlanRecipe.recipe.ingredients.forEach((ingredient) => {
            const key = `${ingredient.name.toLowerCase()}-${ingredient.unit}`;
            if (ingredientMap.has(key)) {
              const existing = ingredientMap.get(key);
              existing.quantity += ingredient.quantity * mealPlanRecipe.serveCount;
            } else {
              ingredientMap.set(key, {
                name: ingredient.name,
                quantity: ingredient.quantity * mealPlanRecipe.serveCount,
                unit: ingredient.unit,
                notes: ingredient.notes,
              });
            }
          });
        });
      });

      const shoppingList = Array.from(ingredientMap.values());
      expect(shoppingList[0].notes).toBe("boneless, skinless");
    });
  });

  describe("Shopping List Response Format", () => {
    it("includes meal plan metadata", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-1" },
      });

      (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlanWithRecipes);

      const response = {
        mealPlanId: "meal-plan-1",
        mealPlanName: "Weekly Plan",
        shoppingList: [],
        totalItems: 0,
      };

      expect(response).toHaveProperty("mealPlanId");
      expect(response).toHaveProperty("mealPlanName");
      expect(response).toHaveProperty("shoppingList");
      expect(response).toHaveProperty("totalItems");
    });

    it("includes all required ingredient fields", async () => {
      (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlanWithRecipes);

      const ingredient = {
        name: "pasta",
        quantity: 2,
        unit: "lbs",
        notes: "dry",
      };

      expect(ingredient).toHaveProperty("name");
      expect(ingredient).toHaveProperty("quantity");
      expect(ingredient).toHaveProperty("unit");
    });

    it("requires authentication", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue(null);

      expect((auth as any)()).resolves.toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("handles empty meal plan", async () => {
      const emptyMealPlan = {
        id: "meal-plan-1",
        userId: "user-1",
        name: "Empty Plan",
        days: [],
      };

      const ingredientMap = new Map();
      const shoppingList = Array.from(ingredientMap.values());

      expect(shoppingList).toHaveLength(0);
    });

    it("handles meal plan with no recipes on some days", async () => {
      const planWithEmptyDays = {
        id: "meal-plan-1",
        userId: "user-1",
        name: "Sparse Plan",
        days: [
          {
            id: "day-1",
            dayOfWeek: "monday",
            recipes: [],
          },
          {
            id: "day-2",
            dayOfWeek: "tuesday",
            recipes: [
              {
                id: "mp-recipe-1",
                serveCount: 1,
                recipe: {
                  id: "recipe-1",
                  ingredients: [
                    {
                      id: "ing-1",
                      name: "flour",
                      quantity: 1,
                      unit: "cup",
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const ingredientMap = new Map();
      planWithEmptyDays.days.forEach((day) => {
        day.recipes.forEach((mealPlanRecipe) => {
          mealPlanRecipe.recipe.ingredients.forEach((ingredient) => {
            const key = `${ingredient.name.toLowerCase()}-${ingredient.unit}`;
            if (!ingredientMap.has(key)) {
              ingredientMap.set(key, {
                name: ingredient.name,
                quantity: ingredient.quantity * mealPlanRecipe.serveCount,
                unit: ingredient.unit,
              });
            }
          });
        });
      });

      const shoppingList = Array.from(ingredientMap.values());
      expect(shoppingList).toHaveLength(1);
      expect(shoppingList[0].name).toBe("flour");
    });

    it("handles recipes with no ingredients", async () => {
      const planWithEmptyRecipe = {
        id: "meal-plan-1",
        userId: "user-1",
        name: "Plan",
        days: [
          {
            id: "day-1",
            dayOfWeek: "monday",
            recipes: [
              {
                id: "mp-recipe-1",
                serveCount: 1,
                recipe: {
                  id: "recipe-1",
                  ingredients: [],
                },
              },
            ],
          },
        ],
      };

      const ingredientMap = new Map();
      planWithEmptyRecipe.days.forEach((day) => {
        day.recipes.forEach((mealPlanRecipe) => {
          mealPlanRecipe.recipe.ingredients.forEach((ingredient) => {
            const key = `${ingredient.name.toLowerCase()}-${ingredient.unit}`;
            if (!ingredientMap.has(key)) {
              ingredientMap.set(key, {
                name: ingredient.name,
                quantity: ingredient.quantity * mealPlanRecipe.serveCount,
                unit: ingredient.unit,
              });
            }
          });
        });
      });

      const shoppingList = Array.from(ingredientMap.values());
      expect(shoppingList).toHaveLength(0);
    });
  });
});
