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
    recipe: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    sharedRecipe: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  GET as getShare,
  POST as postShare,
  DELETE as deleteShare,
} from "../src/app/api/recipes/[id]/share/route";
import { GET as getSharedRecipes } from "../src/app/api/recipes/shared/route";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const makeRequest = (method: string, body?: object) =>
  new NextRequest("http://localhost/api/recipes/recipe-1/share", {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

const mockRecipeOwned = {
  id: "recipe-1",
  userId: "user-1",
  name: "Pasta Carbonara",
  isPublic: false,
  sharedWith: [],
};

const mockRecipeWithShares = {
  ...mockRecipeOwned,
  sharedWith: [
    {
      id: "share-1",
      user: { id: "user-2", email: "bob@example.com", name: "Bob" },
    },
  ],
};

// ---------------------------------------------------------------------------
// GET /api/recipes/[id]/share
// ---------------------------------------------------------------------------
describe("GET /api/recipes/[id]/share", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns sharing status for recipe owner", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.recipe.findUnique as any).mockResolvedValue(mockRecipeWithShares);

    const res = await getShare(makeRequest("GET"), {
      params: Promise.resolve({ id: "recipe-1" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.isPublic).toBe(false);
    expect(data.sharedWith).toHaveLength(1);
    expect(data.sharedWith[0].email).toBe("bob@example.com");
  });

  it("returns 401 when not authenticated", async () => {
    (auth as any).mockResolvedValue(null);

    const res = await getShare(makeRequest("GET"), {
      params: Promise.resolve({ id: "recipe-1" }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 404 when recipe not found", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.recipe.findUnique as any).mockResolvedValue(null);

    const res = await getShare(makeRequest("GET"), {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(res.status).toBe(404);
  });

  it("returns 401 when user is not recipe owner", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-2" } });
    (prisma.recipe.findUnique as any).mockResolvedValue(mockRecipeOwned);

    const res = await getShare(makeRequest("GET"), {
      params: Promise.resolve({ id: "recipe-1" }),
    });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/recipes/[id]/share
// ---------------------------------------------------------------------------
describe("POST /api/recipes/[id]/share", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("makes recipe public", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.recipe.findUnique as any)
      .mockResolvedValueOnce(mockRecipeOwned) // ownership check
      .mockResolvedValueOnce({ ...mockRecipeOwned, isPublic: true, sharedWith: [] }); // updated fetch
    (prisma.recipe.update as any).mockResolvedValue({ ...mockRecipeOwned, isPublic: true });

    const res = await postShare(
      makeRequest("POST", { isPublic: true }),
      { params: Promise.resolve({ id: "recipe-1" }) }
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.isPublic).toBe(true);
    expect(prisma.recipe.update).toHaveBeenCalledWith({
      where: { id: "recipe-1" },
      data: { isPublic: true },
    });
  });

  it("shares recipe with specific user by email", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.recipe.findUnique as any)
      .mockResolvedValueOnce(mockRecipeOwned)
      .mockResolvedValueOnce({ ...mockRecipeWithShares });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "user-2",
      email: "bob@example.com",
      name: "Bob",
    });
    (prisma.sharedRecipe.upsert as any).mockResolvedValue({ id: "share-1" });

    const res = await postShare(
      makeRequest("POST", { shareWithEmail: "bob@example.com" }),
      { params: Promise.resolve({ id: "recipe-1" }) }
    );

    expect(res.status).toBe(200);
    expect(prisma.sharedRecipe.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { recipeId: "recipe-1", sharedWith: "user-2" },
      })
    );
  });

  it("returns 404 when target user email not found", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.recipe.findUnique as any).mockResolvedValue(mockRecipeOwned);
    (prisma.user.findUnique as any).mockResolvedValue(null);

    const res = await postShare(
      makeRequest("POST", { shareWithEmail: "nobody@example.com" }),
      { params: Promise.resolve({ id: "recipe-1" }) }
    );

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/not found/i);
  });

  it("prevents sharing with yourself", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.recipe.findUnique as any).mockResolvedValue(mockRecipeOwned);
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "user-1",
      email: "alice@example.com",
    });

    const res = await postShare(
      makeRequest("POST", { shareWithEmail: "alice@example.com" }),
      { params: Promise.resolve({ id: "recipe-1" }) }
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/yourself/i);
  });

  it("returns 401 when not authenticated", async () => {
    (auth as any).mockResolvedValue(null);

    const res = await postShare(makeRequest("POST", { isPublic: true }), {
      params: Promise.resolve({ id: "recipe-1" }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 401 when non-owner tries to share", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-2" } });
    (prisma.recipe.findUnique as any).mockResolvedValue(mockRecipeOwned);

    const res = await postShare(makeRequest("POST", { isPublic: true }), {
      params: Promise.resolve({ id: "recipe-1" }),
    });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/recipes/[id]/share
// ---------------------------------------------------------------------------
describe("DELETE /api/recipes/[id]/share", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes a specific user's access", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.recipe.findUnique as any).mockResolvedValue(mockRecipeOwned);
    (prisma.sharedRecipe.deleteMany as any).mockResolvedValue({ count: 1 });

    const req = new NextRequest("http://localhost/api/recipes/recipe-1/share", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeUserId: "user-2" }),
    });

    const res = await deleteShare(req, {
      params: Promise.resolve({ id: "recipe-1" }),
    });

    expect(res.status).toBe(200);
    expect(prisma.sharedRecipe.deleteMany).toHaveBeenCalledWith({
      where: { recipeId: "recipe-1", sharedWith: "user-2" },
    });
  });

  it("returns 401 when non-owner tries to unshare", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-2" } });
    (prisma.recipe.findUnique as any).mockResolvedValue(mockRecipeOwned);

    const req = new NextRequest("http://localhost/api/recipes/recipe-1/share", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeUserId: "user-3" }),
    });

    const res = await deleteShare(req, {
      params: Promise.resolve({ id: "recipe-1" }),
    });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/recipes/shared
// ---------------------------------------------------------------------------
describe("GET /api/recipes/shared", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns public recipes from other users and recipes shared with current user", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });

    const publicRecipe = {
      id: "recipe-2",
      userId: "user-2",
      name: "Public Soup",
      isPublic: true,
      ingredients: [],
      user: { id: "user-2", email: "bob@example.com", name: "Bob" },
      dietaryTags: [],
    };

    const sharedRecipe = {
      id: "recipe-3",
      userId: "user-3",
      name: "Shared Stew",
      isPublic: false,
      ingredients: [],
      user: { id: "user-3", email: "carol@example.com", name: "Carol" },
      dietaryTags: [],
    };

    (prisma.recipe.findMany as any).mockResolvedValue([publicRecipe]);
    (prisma.sharedRecipe.findMany as any).mockResolvedValue([
      { recipe: sharedRecipe },
    ]);

    const res = await getSharedRecipes(
      new NextRequest("http://localhost/api/recipes/shared")
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(2);
    const names = data.map((r: { name: string }) => r.name);
    expect(names).toContain("Public Soup");
    expect(names).toContain("Shared Stew");
  });

  it("deduplicates recipes that are both public and shared", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });

    const recipe = {
      id: "recipe-2",
      userId: "user-2",
      name: "Shared Public",
      isPublic: true,
      ingredients: [],
      user: { id: "user-2", email: "bob@example.com", name: "Bob" },
      dietaryTags: [],
    };

    (prisma.recipe.findMany as any).mockResolvedValue([recipe]);
    // Same recipe appears in both public and shared-with-user
    (prisma.sharedRecipe.findMany as any).mockResolvedValue([{ recipe }]);

    const res = await getSharedRecipes(
      new NextRequest("http://localhost/api/recipes/shared")
    );

    const data = await res.json();
    // Should appear only once
    expect(data).toHaveLength(1);
  });

  it("returns 401 when not authenticated", async () => {
    (auth as any).mockResolvedValue(null);

    const res = await getSharedRecipes(
      new NextRequest("http://localhost/api/recipes/shared")
    );

    expect(res.status).toBe(401);
  });

  it("excludes current user's own public recipes", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });

    // The route queries { isPublic: true, userId: { not: userId } }
    // so Prisma won't return own recipes – verify the query params
    (prisma.recipe.findMany as any).mockResolvedValue([]);
    (prisma.sharedRecipe.findMany as any).mockResolvedValue([]);

    await getSharedRecipes(new NextRequest("http://localhost/api/recipes/shared"));

    expect(prisma.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: { not: "user-1" },
        }),
      })
    );
  });
});
