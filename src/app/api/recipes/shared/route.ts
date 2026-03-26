import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/recipes/shared – list public recipes and recipes shared with current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch public recipes (excluding own) and recipes explicitly shared with user in parallel
    const [publicRecipes, sharedWithMe] = await Promise.all([
      prisma.recipe.findMany({
        where: {
          isPublic: true,
          userId: { not: userId },
        },
        include: {
          ingredients: true,
          user: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.sharedRecipe.findMany({
        where: { sharedWith: userId },
        include: {
          recipe: {
            include: {
              ingredients: true,
              user: { select: { id: true, email: true, name: true } },
            },
          },
        },
      }),
    ]);

    // Merge and deduplicate: sharedWith entries may overlap with public
    const publicIds = new Set(publicRecipes.map((r) => r.id));
    const sharedRecipes = sharedWithMe
      .map((s) => s.recipe)
      .filter((r) => !publicIds.has(r.id));

    const result = [
      ...publicRecipes.map((r) => ({ ...r, shareType: "public" as const })),
      ...sharedRecipes.map((r) => ({ ...r, shareType: "shared" as const })),
    ];

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching shared recipes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
