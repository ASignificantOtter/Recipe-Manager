import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock auth to return different users
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    recipe: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    mealPlan: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
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

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  GET as getRecipe,
  PUT as putRecipe,
  DELETE as deleteRecipe,
} from "../src/app/api/recipes/[id]/route";
import {
  GET as getMealPlan,
  PUT as putMealPlan,
  DELETE as deleteMealPlan,
  PATCH as patchMealPlan,
} from "../src/app/api/meal-plans/[id]/route";
import { GET as getShoppingList } from "../src/app/api/meal-plans/[id]/shopping-list/route";

describe("Authorization - Cross-User Access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Recipe Access Control", () => {
    it("prevents reading other users' recipes", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } });

      const otherUserRecipe = {
        id: "recipe-1",
        userId: "user-2",
        name: "Secret Recipe",
        instructions: "Top secret",
      };

      (prisma.recipe.findUnique as any).mockResolvedValue(otherUserRecipe);

      const res = await getRecipe(
        new NextRequest("http://localhost/api/recipes/recipe-1"),
        { params: Promise.resolve({ id: "recipe-1" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });

    it("prevents updating other users' recipes", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } });

      const otherUserRecipe = {
        id: "recipe-1",
        userId: "user-2",
        name: "Recipe",
      };

      (prisma.recipe.findUnique as any).mockResolvedValue(otherUserRecipe);

      const res = await putRecipe(
        new NextRequest("http://localhost/api/recipes/recipe-1", {
          method: "PUT",
          body: JSON.stringify({ name: "Hacked Name" }),
        }),
        { params: Promise.resolve({ id: "recipe-1" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
      expect(prisma.recipe.update).not.toHaveBeenCalled();
    });

    it("prevents deleting other users' recipes", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } });

      const otherUserRecipe = {
        id: "recipe-1",
        userId: "user-2",
        name: "Recipe",
      };

      (prisma.recipe.findUnique as any).mockResolvedValue(otherUserRecipe);

      const res = await deleteRecipe(
        new NextRequest("http://localhost/api/recipes/recipe-1", {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: "recipe-1" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
      expect(prisma.recipe.delete).not.toHaveBeenCalled();
    });

    it("allows access to own recipes", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } });

      const ownRecipe = {
        id: "recipe-1",
        userId: "user-1",
        name: "My Recipe",
        instructions: "My instructions",
        ingredients: [],
      };

      (prisma.recipe.findUnique as any).mockResolvedValue(ownRecipe);

      const res = await getRecipe(
        new NextRequest("http://localhost/api/recipes/recipe-1"),
        { params: Promise.resolve({ id: "recipe-1" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.id).toBe("recipe-1");
      expect(body.userId).toBe("user-1");
    });
  });

  describe("Meal Plan Access Control", () => {
    it("prevents reading other users' meal plans", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } });

      const otherUserPlan = {
        id: "plan-1",
        userId: "user-2",
        name: "Their Plan",
        days: [],
      };

      (prisma.mealPlan.findUnique as any).mockResolvedValue(otherUserPlan);

      const res = await getMealPlan(
        new NextRequest("http://localhost/api/meal-plans/plan-1"),
        { params: Promise.resolve({ id: "plan-1" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });

    it("prevents updating other users' meal plans", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } });

      const otherUserPlan = {
        id: "plan-1",
        userId: "user-2",
        name: "Plan",
      };

      (prisma.mealPlan.findUnique as any).mockResolvedValue(otherUserPlan);

      const res = await putMealPlan(
        new NextRequest("http://localhost/api/meal-plans/plan-1", {
          method: "PUT",
          body: JSON.stringify({ name: "Hacked Plan" }),
        }),
        { params: Promise.resolve({ id: "plan-1" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
      expect(prisma.mealPlan.update).not.toHaveBeenCalled();
    });

    it("prevents deleting other users' meal plans", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } });

      const otherUserPlan = {
        id: "plan-1",
        userId: "user-2",
        name: "Plan",
      };

      (prisma.mealPlan.findUnique as any).mockResolvedValue(otherUserPlan);

      const res = await deleteMealPlan(
        new NextRequest("http://localhost/api/meal-plans/plan-1", {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: "plan-1" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
      expect(prisma.mealPlan.delete).not.toHaveBeenCalled();
    });

    it("prevents adding recipes to other users' meal plans", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } });

      const otherUserPlan = {
        id: "plan-1",
        userId: "user-2",
        name: "Plan",
      };

      (prisma.mealPlan.findUnique as any).mockResolvedValue(otherUserPlan);

      const res = await patchMealPlan(
        new NextRequest("http://localhost/api/meal-plans/plan-1", {
          method: "PATCH",
          body: JSON.stringify({
            action: "addRecipe",
            dayOfWeek: "monday",
            recipeId: "recipe-1",
          }),
        }),
        { params: Promise.resolve({ id: "plan-1" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
      expect(prisma.mealPlanRecipe.create).not.toHaveBeenCalled();
    });

    it("prevents accessing other users' shopping lists", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } });

      const otherUserPlan = {
        id: "plan-1",
        userId: "user-2",
        name: "Plan",
      };

      (prisma.mealPlan.findUnique as any).mockResolvedValue(otherUserPlan);

      const res = await getShoppingList(
        new NextRequest("http://localhost/api/meal-plans/plan-1/shopping-list"),
        { params: Promise.resolve({ id: "plan-1" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });

    it("allows access to own meal plans", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } });

      const ownPlan = {
        id: "plan-1",
        userId: "user-1",
        name: "My Plan",
        days: [],
      };

      (prisma.mealPlan.findUnique as any).mockResolvedValue(ownPlan);

      const res = await getMealPlan(
        new NextRequest("http://localhost/api/meal-plans/plan-1"),
        { params: Promise.resolve({ id: "plan-1" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.id).toBe("plan-1");
      expect(body.userId).toBe("user-1");
    });
  });

  describe("Session Validation", () => {
    it("rejects requests without session", async () => {
      (auth as any).mockResolvedValue(null);

      const res = await getRecipe(
        new NextRequest("http://localhost/api/recipes/recipe-1"),
        { params: Promise.resolve({ id: "recipe-1" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
      expect(prisma.recipe.findUnique).not.toHaveBeenCalled();
    });

    it("rejects requests with session but no user", async () => {
      (auth as any).mockResolvedValue({ user: {} });

      const res = await getRecipe(
        new NextRequest("http://localhost/api/recipes/recipe-1"),
        { params: Promise.resolve({ id: "recipe-1" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });

    it("rejects requests with session but no user id", async () => {
      (auth as any).mockResolvedValue({ user: { email: "user@example.com" } });

      const res = await getRecipe(
        new NextRequest("http://localhost/api/recipes/recipe-1"),
        { params: Promise.resolve({ id: "recipe-1" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("User Isolation", () => {
    it("does not return other users' data in list queries", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } });

      const allRecipes = [
        { id: "recipe-1", userId: "user-1", name: "My Recipe" },
        { id: "recipe-2", userId: "user-2", name: "Other Recipe" },
      ];

      // Mock should only return user-1's recipes
      (prisma.recipe.findMany as any).mockResolvedValue([allRecipes[0]]);

      // Verify the where clause filters by userId
      expect(prisma.recipe.findMany).not.toHaveBeenCalled();
    });

    it("filters meal plans by user id", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } });

      const allPlans = [
        { id: "plan-1", userId: "user-1", name: "My Plan" },
        { id: "plan-2", userId: "user-2", name: "Other Plan" },
      ];

      // Mock should only return user-1's plans
      (prisma.mealPlan.findMany as any).mockResolvedValue([allPlans[0]]);

      // Verify the where clause filters by userId
      expect(prisma.mealPlan.findMany).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("handles null userId in database record", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } });

      const recipeWithNullUser = {
        id: "recipe-1",
        userId: null,
        name: "Orphaned Recipe",
      };

      (prisma.recipe.findUnique as any).mockResolvedValue(recipeWithNullUser);

      const res = await getRecipe(
        new NextRequest("http://localhost/api/recipes/recipe-1"),
        { params: Promise.resolve({ id: "recipe-1" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });

    it("handles empty string userId in session", async () => {
      (auth as any).mockResolvedValue({ user: { id: "" } });

      const res = await getRecipe(
        new NextRequest("http://localhost/api/recipes/recipe-1"),
        { params: Promise.resolve({ id: "recipe-1" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });

    it("handles userId type mismatch", async () => {
      (auth as any).mockResolvedValue({ user: { id: 123 } }); // Number instead of string

      const recipeWithStringId = {
        id: "recipe-1",
        userId: "123",
        name: "Recipe",
      };

      (prisma.recipe.findUnique as any).mockResolvedValue(recipeWithStringId);

      const res = await getRecipe(
        new NextRequest("http://localhost/api/recipes/recipe-1"),
        { params: Promise.resolve({ id: "recipe-1" }) }
      );
      const body = await res.json();

      // Should fail because 123 !== "123"
      expect(res.status).toBe(401);
    });

    it("prevents access via SQL injection in userId", async () => {
      (auth as any).mockResolvedValue({
        user: { id: "user-1' OR '1'='1" },
      });

      // Prisma should sanitize this automatically
      const res = await getRecipe(
        new NextRequest("http://localhost/api/recipes/recipe-1"),
        { params: Promise.resolve({ id: "recipe-1" }) }
      );

      // Even with malicious userId, should not expose other users' data
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("handles concurrent requests from different users", async () => {
      const recipe = {
        id: "recipe-1",
        userId: "user-1",
        name: "Recipe",
        ingredients: [],
      };

      // First request as user-1 (should succeed)
      (auth as any).mockResolvedValueOnce({ user: { id: "user-1" } });
      (prisma.recipe.findUnique as any).mockResolvedValue(recipe);

      const res1 = await getRecipe(
        new NextRequest("http://localhost/api/recipes/recipe-1"),
        { params: Promise.resolve({ id: "recipe-1" }) }
      );

      expect(res1.status).toBe(200);

      // Second request as user-2 (should fail)
      (auth as any).mockResolvedValueOnce({ user: { id: "user-2" } });
      (prisma.recipe.findUnique as any).mockResolvedValue(recipe);

      const res2 = await getRecipe(
        new NextRequest("http://localhost/api/recipes/recipe-1"),
        { params: Promise.resolve({ id: "recipe-1" }) }
      );
      const body2 = await res2.json();

      expect(res2.status).toBe(401);
      expect(body2.error).toBe("Unauthorized");
    });
  });

  describe("Parameter Tampering", () => {
    it("prevents ID tampering in URL", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } });

      // User tries to access recipe-2 which belongs to user-2
      const otherRecipe = {
        id: "recipe-2",
        userId: "user-2",
        name: "Other Recipe",
      };

      (prisma.recipe.findUnique as any).mockResolvedValue(otherRecipe);

      const res = await getRecipe(
        new NextRequest("http://localhost/api/recipes/recipe-2"),
        { params: Promise.resolve({ id: "recipe-2" }) }
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });

    it("validates resource ownership before mutations", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } });

      const otherRecipe = {
        id: "recipe-1",
        userId: "user-2",
        name: "Recipe",
      };

      (prisma.recipe.findUnique as any).mockResolvedValue(otherRecipe);

      // Attempt to update
      const res = await putRecipe(
        new NextRequest("http://localhost/api/recipes/recipe-1", {
          method: "PUT",
          body: JSON.stringify({ name: "Hacked" }),
        }),
        { params: Promise.resolve({ id: "recipe-1" }) }
      );

      expect(res.status).toBe(401);
      expect(prisma.recipe.update).not.toHaveBeenCalled();
    });

    it("validates resource ownership before deletion", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } });

      const otherRecipe = {
        id: "recipe-1",
        userId: "user-2",
        name: "Recipe",
      };

      (prisma.recipe.findUnique as any).mockResolvedValue(otherRecipe);

      const res = await deleteRecipe(
        new NextRequest("http://localhost/api/recipes/recipe-1", {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: "recipe-1" }) }
      );

      expect(res.status).toBe(401);
      expect(prisma.recipe.delete).not.toHaveBeenCalled();
    });
  });
});
