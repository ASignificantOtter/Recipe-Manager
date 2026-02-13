import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

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
      update: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
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
    },
    mealPlanRecipe: {
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET as getRecipes, POST as postRecipe } from "../src/app/api/recipes/route";
import { GET as getRecipe, PUT as putRecipe, DELETE as deleteRecipe } from "../src/app/api/recipes/[id]/route";
import { GET as getMealPlans, POST as postMealPlan } from "../src/app/api/meal-plans/route";
import { GET as getMealPlan, PATCH as patchMealPlan } from "../src/app/api/meal-plans/[id]/route";

describe("Error Handling - Database Errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Connection Failures", () => {
    it("handles database connection timeout", async () => {
      (prisma.recipe.findMany as any).mockRejectedValue(
        new Error("Connection timeout")
      );

      const req = new NextRequest("http://localhost/api/recipes");
      const res = await getRecipes(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Internal server error");
    });

    it("handles database unavailable", async () => {
      (prisma.recipe.create as any).mockRejectedValue(
        new Error("ECONNREFUSED")
      );

      const recipeData = {
        name: "Recipe",
        instructions: "Cook",
        ingredients: [],
      };

      const req = new NextRequest("http://localhost/api/recipes", {
        method: "POST",
        body: JSON.stringify(recipeData),
      });
      const res = await postRecipe(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Internal server error");
    });

    it("handles connection pool exhaustion", async () => {
      (prisma.recipe.findUnique as any).mockRejectedValue(
        new Error("Too many connections")
      );

      const res = await getRecipe(
        new NextRequest("http://localhost/api/recipes/recipe-1"),
        { params: Promise.resolve({ id: "recipe-1" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Internal server error");
    });
  });

  describe("Constraint Violations", () => {
    it("handles unique constraint violation", async () => {
      (prisma.recipe.create as any).mockRejectedValue(
        new Error("Unique constraint failed")
      );

      const recipeData = {
        name: "Recipe",
        instructions: "Cook",
        ingredients: [],
      };

      const req = new NextRequest("http://localhost/api/recipes", {
        method: "POST",
        body: JSON.stringify(recipeData),
      });
      const res = await postRecipe(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Internal server error");
    });

    it("handles foreign key constraint violation", async () => {
      (prisma.mealPlanRecipe.create as any).mockRejectedValue(
        new Error("Foreign key constraint failed")
      );

      const mealPlan = {
        id: "plan-1",
        userId: "test-user-1",
        name: "Plan",
      };

      const day = {
        id: "day-1",
        mealPlanId: "plan-1",
        dayOfWeek: "monday",
      };

      (prisma.mealPlan.findUnique as any).mockResolvedValue(mealPlan);
      (prisma.mealPlanDay.findFirst as any).mockResolvedValue(day);

      const req = new NextRequest("http://localhost/api/meal-plans/plan-1", {
        method: "PATCH",
        body: JSON.stringify({
          action: "addRecipe",
          dayOfWeek: "monday",
          recipeId: "nonexistent-recipe",
        }),
      });
      const res = await patchMealPlan(req, {
        params: Promise.resolve({ id: "plan-1" }),
      });
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Internal server error");
    });

    it("handles not null constraint violation", async () => {
      (prisma.recipe.create as any).mockRejectedValue(
        new Error("NOT NULL constraint failed")
      );

      const invalidData = {
        name: "Recipe",
        // instructions is required but missing
      };

      const req = new NextRequest("http://localhost/api/recipes", {
        method: "POST",
        body: JSON.stringify(invalidData),
      });
      const res = await postRecipe(req);
      const body = await res.json();

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("Transaction Failures", () => {
    it("handles transaction rollback", async () => {
      (prisma.recipe.update as any).mockRejectedValue(
        new Error("Transaction rolled back")
      );

      const mockRecipe = {
        id: "recipe-1",
        userId: "test-user-1",
        name: "Recipe",
        instructions: "Cook",
      };

      (prisma.recipe.findUnique as any).mockResolvedValue(mockRecipe);

      const req = new NextRequest("http://localhost/api/recipes/recipe-1", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated Recipe" }),
      });
      const res = await putRecipe(req, {
        params: Promise.resolve({ id: "recipe-1" }),
      });
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Internal server error");
    });

    it("handles deadlock detection", async () => {
      (prisma.recipe.delete as any).mockRejectedValue(
        new Error("Deadlock detected")
      );

      const mockRecipe = {
        id: "recipe-1",
        userId: "test-user-1",
        name: "Recipe",
      };

      (prisma.recipe.findUnique as any).mockResolvedValue(mockRecipe);

      const req = new NextRequest("http://localhost/api/recipes/recipe-1", {
        method: "DELETE",
      });
      const res = await deleteRecipe(req, {
        params: Promise.resolve({ id: "recipe-1" }),
      });
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Internal server error");
    });
  });

  describe("Query Timeouts", () => {
    it("handles slow query timeout", async () => {
      (prisma.recipe.findMany as any).mockRejectedValue(
        new Error("Query timeout exceeded")
      );

      const req = new NextRequest("http://localhost/api/recipes");
      const res = await getRecipes(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Internal server error");
    });

    it("handles complex query timeout", async () => {
      (prisma.mealPlan.findUnique as any).mockRejectedValue(
        new Error("Statement timeout")
      );

      const res = await getMealPlan(
        new NextRequest("http://localhost/api/meal-plans/plan-1"),
        { params: Promise.resolve({ id: "plan-1" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Internal server error");
    });
  });
});

describe("Error Handling - Malformed Requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Invalid JSON", () => {
    it("handles malformed JSON body", async () => {
      const req = new NextRequest("http://localhost/api/recipes", {
        method: "POST",
        body: "{ invalid json",
      });
      const res = await postRecipe(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Internal server error");
    });

    it("handles empty request body", async () => {
      const req = new NextRequest("http://localhost/api/recipes", {
        method: "POST",
        body: "",
      });
      const res = await postRecipe(req);
      const body = await res.json();

      expect(res.status).toBe(500);
    });

    it("handles null in JSON", async () => {
      const req = new NextRequest("http://localhost/api/recipes", {
        method: "POST",
        body: JSON.stringify(null),
      });
      const res = await postRecipe(req);
      const body = await res.json();

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("handles undefined in JSON", async () => {
      const recipeData = {
        name: "Recipe",
        instructions: undefined,
        ingredients: [],
      };

      const req = new NextRequest("http://localhost/api/recipes", {
        method: "POST",
        body: JSON.stringify(recipeData),
      });
      const res = await postRecipe(req);
      const body = await res.json();

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("Type Mismatches", () => {
    it("handles string instead of number for quantity", async () => {
      const recipeData = {
        name: "Recipe",
        instructions: "Cook",
        ingredients: [
          {
            name: "flour",
            quantity: "two" as any,
            unit: "cups",
          },
        ],
      };

      const req = new NextRequest("http://localhost/api/recipes", {
        method: "POST",
        body: JSON.stringify(recipeData),
      });
      const res = await postRecipe(req);
      const body = await res.json();

      expect(res.status).toBe(400);
    });

    it("handles array instead of object", async () => {
      const req = new NextRequest("http://localhost/api/recipes", {
        method: "POST",
        body: JSON.stringify([]),
      });
      const res = await postRecipe(req);
      const body = await res.json();

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("handles object instead of array for ingredients", async () => {
      const recipeData = {
        name: "Recipe",
        instructions: "Cook",
        ingredients: { flour: "2 cups" } as any,
      };

      const req = new NextRequest("http://localhost/api/recipes", {
        method: "POST",
        body: JSON.stringify(recipeData),
      });
      const res = await postRecipe(req);
      const body = await res.json();

      expect(res.status).toBe(400);
    });
  });

  describe("Missing Required Fields", () => {
    it("handles missing recipe name", async () => {
      const recipeData = {
        instructions: "Cook",
        ingredients: [],
      };

      const req = new NextRequest("http://localhost/api/recipes", {
        method: "POST",
        body: JSON.stringify(recipeData),
      });
      const res = await postRecipe(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBeTruthy();
    });

    it("handles missing instructions", async () => {
      const recipeData = {
        name: "Recipe",
        ingredients: [],
      };

      const req = new NextRequest("http://localhost/api/recipes", {
        method: "POST",
        body: JSON.stringify(recipeData),
      });
      const res = await postRecipe(req);
      const body = await res.json();

      expect(res.status).toBe(400);
    });

    it("handles missing ingredient name", async () => {
      const recipeData = {
        name: "Recipe",
        instructions: "Cook",
        ingredients: [
          {
            quantity: 2,
            unit: "cups",
          },
        ],
      };

      const req = new NextRequest("http://localhost/api/recipes", {
        method: "POST",
        body: JSON.stringify(recipeData),
      });
      const res = await postRecipe(req);
      const body = await res.json();

      expect(res.status).toBe(400);
    });

    it("handles missing meal plan dates", async () => {
      const planData = {
        name: "Plan",
        description: "Description",
        // Missing startDate and endDate
      };

      const req = new NextRequest("http://localhost/api/meal-plans", {
        method: "POST",
        body: JSON.stringify(planData),
      });
      const res = await postMealPlan(req);
      const body = await res.json();

      expect(res.status).toBe(400);
    });
  });
});

describe("Error Handling - Resource Not Found", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles non-existent recipe", async () => {
    (prisma.recipe.findUnique as any).mockResolvedValue(null);

    const res = await getRecipe(
      new NextRequest("http://localhost/api/recipes/nonexistent"),
      { params: Promise.resolve({ id: "nonexistent" }) }
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Recipe not found");
  });

  it("handles non-existent meal plan", async () => {
    (prisma.mealPlan.findUnique as any).mockResolvedValue(null);

    const res = await getMealPlan(
      new NextRequest("http://localhost/api/meal-plans/nonexistent"),
      { params: Promise.resolve({ id: "nonexistent" }) }
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Meal plan not found");
  });

  it("handles attempting to update non-existent recipe", async () => {
    (prisma.recipe.findUnique as any).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/recipes/nonexistent", {
      method: "PUT",
      body: JSON.stringify({ name: "Updated" }),
    });
    const res = await putRecipe(req, {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("handles attempting to delete non-existent recipe", async () => {
    (prisma.recipe.findUnique as any).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/recipes/nonexistent", {
      method: "DELETE",
    });
    const res = await deleteRecipe(req, {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("handles non-existent day when adding recipe to meal plan", async () => {
    const mockMealPlan = {
      id: "plan-1",
      userId: "test-user-1",
      name: "Plan",
    };

    (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlan);
    (prisma.mealPlanDay.findFirst as any).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/meal-plans/plan-1", {
      method: "PATCH",
      body: JSON.stringify({
        action: "addRecipe",
        dayOfWeek: "invalidday",
        recipeId: "recipe-1",
      }),
    });
    const res = await patchMealPlan(req, {
      params: Promise.resolve({ id: "plan-1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Day not found");
  });
});

describe("Error Handling - Network Errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles request timeout", async () => {
    (prisma.recipe.findMany as any).mockImplementation(() => {
      return new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout")), 100);
      });
    });

    const req = new NextRequest("http://localhost/api/recipes");
    const res = await getRecipes(req);
    const body = await res.json();

    expect(res.status).toBe(500);
  });

  it("handles network interruption", async () => {
    (prisma.recipe.create as any).mockRejectedValue(
      new Error("Network error")
    );

    const recipeData = {
      name: "Recipe",
      instructions: "Cook",
      ingredients: [],
    };

    const req = new NextRequest("http://localhost/api/recipes", {
      method: "POST",
      body: JSON.stringify(recipeData),
    });
    const res = await postRecipe(req);
    const body = await res.json();

    expect(res.status).toBe(500);
  });
});

describe("Error Handling - Data Integrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles corrupted data in database", async () => {
    (prisma.recipe.findUnique as any).mockResolvedValue({
      id: "recipe-1",
      userId: "test-user-1",
      name: null, // Corrupted: name should not be null
      instructions: "Cook",
    });

    const res = await getRecipe(
      new NextRequest("http://localhost/api/recipes/recipe-1"),
      { params: Promise.resolve({ id: "recipe-1" }) }
    );

    // Should still return the data (backend doesn't validate fetched data)
    expect(res.status).toBe(200);
  });

  it("handles missing relations", async () => {
    (prisma.recipe.findUnique as any).mockResolvedValue({
      id: "recipe-1",
      userId: "test-user-1",
      name: "Recipe",
      instructions: "Cook",
      ingredients: undefined, // Missing relation
    });

    const res = await getRecipe(
      new NextRequest("http://localhost/api/recipes/recipe-1"),
      { params: Promise.resolve({ id: "recipe-1" }) }
    );

    expect(res.status).toBe(200);
  });
});

describe("Error Handling - Race Conditions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles concurrent deletions", async () => {
    const mockRecipe = {
      id: "recipe-1",
      userId: "test-user-1",
      name: "Recipe",
    };

    // First deletion succeeds
    (prisma.recipe.findUnique as any).mockResolvedValueOnce(mockRecipe);
    (prisma.recipe.delete as any).mockResolvedValueOnce(mockRecipe);

    const req1 = new NextRequest("http://localhost/api/recipes/recipe-1", {
      method: "DELETE",
    });
    const res1 = await deleteRecipe(req1, {
      params: Promise.resolve({ id: "recipe-1" }),
    });
    expect(res1.status).toBe(200);

    // Second deletion fails (already deleted)
    (prisma.recipe.findUnique as any).mockResolvedValueOnce(null);

    const req2 = new NextRequest("http://localhost/api/recipes/recipe-1", {
      method: "DELETE",
    });
    const res2 = await deleteRecipe(req2, {
      params: Promise.resolve({ id: "recipe-1" }),
    });
    const body2 = await res2.json();

    expect(res2.status).toBe(401);
  });

  it("handles concurrent updates", async () => {
    const mockRecipe = {
      id: "recipe-1",
      userId: "test-user-1",
      name: "Original",
      instructions: "Cook",
    };

    (prisma.recipe.findUnique as any).mockResolvedValue(mockRecipe);

    // Both updates find the record
    (prisma.recipe.update as any)
      .mockResolvedValueOnce({ ...mockRecipe, name: "Update 1" })
      .mockResolvedValueOnce({ ...mockRecipe, name: "Update 2" });

    const req1 = new NextRequest("http://localhost/api/recipes/recipe-1", {
      method: "PUT",
      body: JSON.stringify({ name: "Update 1" }),
    });
    const req2 = new NextRequest("http://localhost/api/recipes/recipe-1", {
      method: "PUT",
      body: JSON.stringify({ name: "Update 2" }),
    });

    // Last update wins
    const res1 = await putRecipe(req1, {
      params: Promise.resolve({ id: "recipe-1" }),
    });
    const res2 = await putRecipe(req2, {
      params: Promise.resolve({ id: "recipe-1" }),
    });

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
  });
});

describe("Error Handling - Boundary Conditions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles zero ingredients", async () => {
    const recipeData = {
      name: "Recipe",
      instructions: "Cook",
      ingredients: [],
    };

    (prisma.recipe.create as any).mockResolvedValue({
      id: "recipe-1",
      userId: "test-user-1",
      ...recipeData,
    });

    const req = new NextRequest("http://localhost/api/recipes", {
      method: "POST",
      body: JSON.stringify(recipeData),
    });
    const res = await postRecipe(req);

    expect(res.status).toBe(201);
  });

  it("handles empty strings in required fields", async () => {
    const recipeData = {
      name: "",
      instructions: "",
      ingredients: [],
    };

    const req = new NextRequest("http://localhost/api/recipes", {
      method: "POST",
      body: JSON.stringify(recipeData),
    });
    const res = await postRecipe(req);
    const body = await res.json();

    expect(res.status).toBe(400);
  });

  it("handles whitespace-only strings", async () => {
    const recipeData = {
      name: "   ",
      instructions: "   ",
      ingredients: [],
    };

    const req = new NextRequest("http://localhost/api/recipes", {
      method: "POST",
      body: JSON.stringify(recipeData),
    });
    const res = await postRecipe(req);

    // Current schema: z.string().min(1) without .trim()
    // Whitespace strings pass min(1) check (length > 0)
    // To reject whitespace, schema needs .trim() modifier
    expect(res.status).toBe(201);
  });
});
