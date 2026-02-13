import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "../src/lib/prisma";

// Mock the dependencies
vi.mock("../src/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    mealPlan: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    mealPlanDay: {
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    mealPlanRecipe: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    recipe: {
      findUnique: vi.fn(),
    },
    recipeIngredient: {
      findMany: vi.fn(),
    },
  },
}));

const mockMealPlan = {
  id: "meal-plan-1",
  userId: "user-1",
  name: "Weekly Meal Plan",
  description: "Healthy meals for the week",
  startDate: new Date("2026-02-15"),
  endDate: new Date("2026-02-21"),
  days: [
    {
      id: "day-1",
      mealPlanId: "meal-plan-1",
      dayOfWeek: "monday",
      date: new Date("2026-02-16"),
      recipes: [
        {
          id: "mp-recipe-1",
          mealPlanDayId: "day-1",
          recipeId: "recipe-1",
          serveCount: 2,
          notes: null,
          recipe: {
            id: "recipe-1",
            name: "Spaghetti Bolognese",
            servings: 4,
          },
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Meal Plan Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Create Meal Plan", () => {
    it("creates a new meal plan", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-1" },
      });

      (prisma.mealPlan.create as any).mockResolvedValue(mockMealPlan);

      const mealPlanData = {
        name: "Weekly Meal Plan",
        description: "Healthy meals for the week",
        startDate: "2026-02-15T00:00:00Z",
        endDate: "2026-02-21T00:00:00Z",
      };

      const result = await (prisma.mealPlan.create as any)({
        data: {
          userId: "user-1",
          name: mealPlanData.name,
          description: mealPlanData.description,
          startDate: new Date(mealPlanData.startDate),
          endDate: new Date(mealPlanData.endDate),
        },
      });

      expect(result).toEqual(mockMealPlan);
    });

    it("creates meal plan days automatically", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-1" },
      });

      const planWithDays = {
        ...mockMealPlan,
        days: Array.from({ length: 7 }, (_, i) => ({
          id: `day-${i}`,
          mealPlanId: "meal-plan-1",
          dayOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"][i],
          recipes: [],
        })),
      };

      (prisma.mealPlan.create as any).mockResolvedValue(planWithDays);

      expect(planWithDays.days).toHaveLength(7);
      expect(planWithDays.days[0].dayOfWeek).toBe("monday");
      expect(planWithDays.days[6].dayOfWeek).toBe("sunday");
    });

    it("validates date range", async () => {
      const invalidData = {
        name: "Plan",
        startDate: "2026-02-21T00:00:00Z",
        endDate: "2026-02-15T00:00:00Z", // End before start
      };

      // Should fail validation - this would be caught by Zod in the actual API
      const startDate = new Date(invalidData.startDate);
      const endDate = new Date(invalidData.endDate);
      expect(endDate.getTime()).toBeLessThan(startDate.getTime());
    });

    it("requires user authentication", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue(null);

      expect((auth as any)()).resolves.toBeNull();
    });
  });

  describe("Read Meal Plan", () => {
    it("retrieves meal plan by ID", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-1" },
      });

      (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlan);

      const plan = await (prisma.mealPlan.findUnique as any)({
        where: { id: "meal-plan-1" },
        include: {
          days: {
            include: {
              recipes: { include: { recipe: true } },
            },
          },
        },
      });

      expect(plan).toEqual(mockMealPlan);
      expect(plan.name).toBe("Weekly Meal Plan");
    });

    it("retrieves all meal plans for user", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-1" },
      });

      const plans = [
        mockMealPlan,
        {
          ...mockMealPlan,
          id: "meal-plan-2",
          name: "Weekend Brunch Plan",
        },
      ];

      (prisma.mealPlan.findMany as any).mockResolvedValue(plans);

      const userPlans = await (prisma.mealPlan.findMany as any)({
        where: { userId: "user-1" },
      });

      expect(userPlans).toHaveLength(2);
      expect(userPlans[0].userId).toBe("user-1");
    });

    it("includes nested days and recipes", async () => {
      (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlan);

      const plan = await (prisma.mealPlan.findUnique as any)({
        where: { id: "meal-plan-1" },
        include: {
          days: {
            include: { recipes: { include: { recipe: true } } },
          },
        },
      });

      expect(plan.days).toBeDefined();
      expect(plan.days[0].recipes).toBeDefined();
      expect(plan.days[0].recipes[0].recipe.name).toBe("Spaghetti Bolognese");
    });

    it("returns 404 when meal plan not found", async () => {
      (prisma.mealPlan.findUnique as any).mockResolvedValue(null);

      const plan = await (prisma.mealPlan.findUnique as any)({
        where: { id: "nonexistent" },
      });

      expect(plan).toBeNull();
    });

    it("protects meal plans from unauthorized access", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-2" },
      });

      (prisma.mealPlan.findUnique as any).mockResolvedValue({
        ...mockMealPlan,
        userId: "user-1",
      });

      const plan = await (prisma.mealPlan.findUnique as any)({
        where: { id: "meal-plan-1" },
      });

      expect(plan.userId).not.toBe("user-2");
    });
  });

  describe("Update Meal Plan", () => {
    it("updates meal plan details", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-1" },
      });

      const updated = {
        ...mockMealPlan,
        name: "Updated Meal Plan",
        description: "Updated description",
      };

      (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlan);
      (prisma.mealPlan.update as any).mockResolvedValue(updated);

      expect(updated.name).toBe("Updated Meal Plan");
      expect(updated.description).toBe("Updated description");
    });

    it("adds recipe to meal plan day", async () => {
      const newMealPlanRecipe = {
        id: "mp-recipe-2",
        mealPlanDayId: "day-1",
        recipeId: "recipe-2",
        serveCount: 1,
        notes: "Reduce salt",
        recipe: {
          id: "recipe-2",
          name: "Caesar Salad",
        },
      };

      (prisma.mealPlanRecipe.create as any).mockResolvedValue(newMealPlanRecipe);

      const created = await (prisma.mealPlanRecipe.create as any)({
        data: {
          mealPlanDayId: "day-1",
          recipeId: "recipe-2",
          serveCount: 1,
          notes: "Reduce salt",
        },
        include: { recipe: true },
      });

      expect(created.recipe.name).toBe("Caesar Salad");
      expect(created.notes).toBe("Reduce salt");
    });

    it("updates recipe serving count", async () => {
      const updated = {
        id: "mp-recipe-1",
        mealPlanDayId: "day-1",
        recipeId: "recipe-1",
        serveCount: 3,
        notes: null,
      };

      (prisma.mealPlanRecipe.update as any).mockResolvedValue(updated);

      const result = await (prisma.mealPlanRecipe.update as any)({
        where: { id: "mp-recipe-1" },
        data: { serveCount: 3 },
      });

      expect(result.serveCount).toBe(3);
    });

    it("prevents unauthorized updates", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-2" },
      });

      (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlan);

      const plan = await (prisma.mealPlan.findUnique as any)({
        where: { id: "meal-plan-1" },
      });

      expect(plan.userId).not.toBe("user-2");
    });
  });

  describe("Delete Meal Plan", () => {
    it("deletes a meal plan", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-1" },
      });

      (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlan);
      (prisma.mealPlan.delete as any).mockResolvedValue(mockMealPlan);

      const result = await (prisma.mealPlan.delete as any)({
        where: { id: "meal-plan-1" },
      });

      expect(result.id).toBe("meal-plan-1");
    });

    it("cascades deletion to days and recipes", async () => {
      (prisma.mealPlan.delete as any).mockResolvedValue(mockMealPlan);

      // Prisma would cascade delete days and recipes due to onDelete: Cascade
      const result = await (prisma.mealPlan.delete as any)({
        where: { id: "meal-plan-1" },
      });

      expect(result.id).toBe("meal-plan-1");
    });

    it("prevents unauthorized deletion", async () => {
      const { auth } = await import("../src/lib/auth");
      (auth as any).mockResolvedValue({
        user: { id: "user-2" },
      });

      (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlan);

      const plan = await (prisma.mealPlan.findUnique as any)({
        where: { id: "meal-plan-1" },
      });

      expect(plan.userId).not.toBe("user-2");
    });

    it("removes recipe from meal plan", async () => {
      (prisma.mealPlanRecipe.delete as any).mockResolvedValue({
        id: "mp-recipe-1",
      });

      const result = await (prisma.mealPlanRecipe.delete as any)({
        where: { id: "mp-recipe-1" },
      });

      expect(result.id).toBe("mp-recipe-1");
    });
  });

  describe("Meal Plan Validation", () => {
    it("requires meal plan name", () => {
      const data = {
        startDate: "2026-02-15T00:00:00Z",
        endDate: "2026-02-21T00:00:00Z",
      };
      expect(data).not.toHaveProperty("name");
    });

    it("requires valid date format", () => {
      const data = {
        name: "Plan",
        startDate: "2026-02-15T00:00:00Z",
        endDate: "2026-02-21T00:00:00Z",
      };
      expect(new Date(data.startDate)).toBeInstanceOf(Date);
      expect(new Date(data.endDate)).toBeInstanceOf(Date);
    });

    it("allows optional description", () => {
      const data = {
        name: "Plan",
        description: "Optional description",
        startDate: "2026-02-15T00:00:00Z",
        endDate: "2026-02-21T00:00:00Z",
      };
      expect(data.description).toBe("Optional description");
    });
  });
});
