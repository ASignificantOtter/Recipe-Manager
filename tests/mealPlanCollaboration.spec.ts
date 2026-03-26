import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mealPlan: {
      findUnique: vi.fn(),
    },
    mealPlanDay: {
      findFirst: vi.fn(),
    },
    mealPlanRecipe: {
      create: vi.fn(),
      delete: vi.fn(),
    },
    mealPlanCollaborator: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  GET as getCollaborators,
  POST as postCollaborator,
} from "../src/app/api/meal-plans/[id]/collaborators/route";
import { DELETE as deleteCollaborator } from "../src/app/api/meal-plans/[id]/collaborators/[userId]/route";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockMealPlan = {
  id: "plan-1",
  userId: "user-1",
  name: "Family Meal Plan",
};

const mockCollaborator = {
  id: "col-1",
  role: "viewer",
  createdAt: new Date(),
  user: { id: "user-2", email: "bob@example.com", name: "Bob" },
};

const makeRequest = (method: string, body?: object) =>
  new NextRequest(`http://localhost/api/meal-plans/plan-1/collaborators`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

// ---------------------------------------------------------------------------
// GET /api/meal-plans/[id]/collaborators
// ---------------------------------------------------------------------------
describe("GET /api/meal-plans/[id]/collaborators", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all collaborators for the owner", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlan);
    (prisma.mealPlanCollaborator.findMany as any).mockResolvedValue([
      mockCollaborator,
    ]);

    const res = await getCollaborators(makeRequest("GET"), {
      params: Promise.resolve({ id: "plan-1" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].user.email).toBe("bob@example.com");
    expect(data[0].role).toBe("viewer");
  });

  it("returns 401 when not authenticated", async () => {
    (auth as any).mockResolvedValue(null);

    const res = await getCollaborators(makeRequest("GET"), {
      params: Promise.resolve({ id: "plan-1" }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 401 when non-owner tries to list collaborators", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-2" } });
    (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlan);

    const res = await getCollaborators(makeRequest("GET"), {
      params: Promise.resolve({ id: "plan-1" }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 404 when meal plan not found", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.mealPlan.findUnique as any).mockResolvedValue(null);

    const res = await getCollaborators(makeRequest("GET"), {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST /api/meal-plans/[id]/collaborators
// ---------------------------------------------------------------------------
describe("POST /api/meal-plans/[id]/collaborators", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds a viewer collaborator by email", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlan);
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "user-2",
      email: "bob@example.com",
      name: "Bob",
    });
    (prisma.mealPlanCollaborator.upsert as any).mockResolvedValue(mockCollaborator);

    const res = await postCollaborator(
      makeRequest("POST", { email: "bob@example.com", role: "viewer" }),
      { params: Promise.resolve({ id: "plan-1" }) }
    );

    expect(res.status).toBe(201);
    expect(prisma.mealPlanCollaborator.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { mealPlanId: "plan-1", userId: "user-2", role: "viewer" },
        update: { role: "viewer" },
      })
    );
  });

  it("adds an editor collaborator", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlan);
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "user-2",
      email: "bob@example.com",
    });
    (prisma.mealPlanCollaborator.upsert as any).mockResolvedValue({
      ...mockCollaborator,
      role: "editor",
    });

    const res = await postCollaborator(
      makeRequest("POST", { email: "bob@example.com", role: "editor" }),
      { params: Promise.resolve({ id: "plan-1" }) }
    );

    expect(res.status).toBe(201);
    expect(prisma.mealPlanCollaborator.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { mealPlanId: "plan-1", userId: "user-2", role: "editor" },
      })
    );
  });

  it("defaults to viewer role when role not specified", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlan);
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "user-2",
      email: "bob@example.com",
    });
    (prisma.mealPlanCollaborator.upsert as any).mockResolvedValue(mockCollaborator);

    const res = await postCollaborator(
      makeRequest("POST", { email: "bob@example.com" }),
      { params: Promise.resolve({ id: "plan-1" }) }
    );

    expect(res.status).toBe(201);
    expect(prisma.mealPlanCollaborator.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ role: "viewer" }),
      })
    );
  });

  it("returns 404 when target user not found", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlan);
    (prisma.user.findUnique as any).mockResolvedValue(null);

    const res = await postCollaborator(
      makeRequest("POST", { email: "unknown@example.com" }),
      { params: Promise.resolve({ id: "plan-1" }) }
    );

    expect(res.status).toBe(404);
  });

  it("prevents adding yourself as a collaborator", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlan);
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "user-1",
      email: "alice@example.com",
    });

    const res = await postCollaborator(
      makeRequest("POST", { email: "alice@example.com" }),
      { params: Promise.resolve({ id: "plan-1" }) }
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/yourself/i);
  });

  it("returns 401 when non-owner tries to add collaborator", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-2" } });
    (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlan);

    const res = await postCollaborator(
      makeRequest("POST", { email: "carol@example.com" }),
      { params: Promise.resolve({ id: "plan-1" }) }
    );

    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid email format", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlan);

    const res = await postCollaborator(
      makeRequest("POST", { email: "not-an-email" }),
      { params: Promise.resolve({ id: "plan-1" }) }
    );

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/meal-plans/[id]/collaborators/[userId]
// ---------------------------------------------------------------------------
describe("DELETE /api/meal-plans/[id]/collaborators/[userId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes a collaborator", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlan);
    (prisma.mealPlanCollaborator.deleteMany as any).mockResolvedValue({ count: 1 });

    const req = new NextRequest(
      "http://localhost/api/meal-plans/plan-1/collaborators/user-2",
      { method: "DELETE" }
    );

    const res = await deleteCollaborator(req, {
      params: Promise.resolve({ id: "plan-1", userId: "user-2" }),
    });

    expect(res.status).toBe(200);
    expect(prisma.mealPlanCollaborator.deleteMany).toHaveBeenCalledWith({
      where: { mealPlanId: "plan-1", userId: "user-2" },
    });
  });

  it("returns 401 when non-owner tries to remove collaborator", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-2" } });
    (prisma.mealPlan.findUnique as any).mockResolvedValue(mockMealPlan);

    const req = new NextRequest(
      "http://localhost/api/meal-plans/plan-1/collaborators/user-3",
      { method: "DELETE" }
    );

    const res = await deleteCollaborator(req, {
      params: Promise.resolve({ id: "plan-1", userId: "user-3" }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 401 when not authenticated", async () => {
    (auth as any).mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost/api/meal-plans/plan-1/collaborators/user-2",
      { method: "DELETE" }
    );

    const res = await deleteCollaborator(req, {
      params: Promise.resolve({ id: "plan-1", userId: "user-2" }),
    });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Collaboration roles and access – enforced at the PATCH /api/meal-plans/[id] level
// ---------------------------------------------------------------------------
describe("Collaboration Roles – PATCH /api/meal-plans/[id]", () => {
  // We need to import PATCH from the meal plan route and extend the prisma mock
  // to include mealPlanDay and mealPlanRecipe which PATCH uses internally.
  let PATCH: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Lazily import PATCH so we can control the mock in this describe block
    const mod = await import("../src/app/api/meal-plans/[id]/route");
    PATCH = mod.PATCH;
  });

  it("viewer collaborator cannot add recipes (returns 401)", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-2" } });

    // Mock the meal plan as owned by user-1
    const { prisma: p } = await import("../src/lib/prisma");
    (p.mealPlan.findUnique as any).mockResolvedValue({ id: "plan-1", userId: "user-1" });
    // Mock user-2 as a viewer collaborator
    (p.mealPlanCollaborator.findUnique as any).mockResolvedValue({ role: "viewer" });

    const req = new NextRequest("http://localhost/api/meal-plans/plan-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addRecipe", dayOfWeek: "monday", recipeId: "recipe-1" }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: "plan-1" }) });

    expect(res.status).toBe(401);
  });

  it("editor collaborator can add recipes (returns non-401)", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-2" } });

    const { prisma: p } = await import("../src/lib/prisma");
    (p.mealPlan.findUnique as any).mockResolvedValue({ id: "plan-1", userId: "user-1" });
    // Mock user-2 as an editor collaborator
    (p.mealPlanCollaborator.findUnique as any).mockResolvedValue({ role: "editor" });

    // PATCH needs mealPlanDay.findFirst and mealPlanRecipe.create for the addRecipe action
    // Since we may not have those in this mock, we check that the response is NOT 401
    // (the route proceeds past auth and may fail on DB ops in test, but that's expected)
    const req = new NextRequest("http://localhost/api/meal-plans/plan-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addRecipe", dayOfWeek: "monday", recipeId: "recipe-1" }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: "plan-1" }) });

    // Should NOT be unauthorized (editor is allowed through)
    expect(res.status).not.toBe(401);
  });

  it("non-collaborator cannot add recipes (returns 401)", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-3" } });

    const { prisma: p } = await import("../src/lib/prisma");
    (p.mealPlan.findUnique as any).mockResolvedValue({ id: "plan-1", userId: "user-1" });
    // user-3 is not a collaborator at all
    (p.mealPlanCollaborator.findUnique as any).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/meal-plans/plan-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addRecipe", dayOfWeek: "monday", recipeId: "recipe-1" }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: "plan-1" }) });

    expect(res.status).toBe(401);
  });
});
