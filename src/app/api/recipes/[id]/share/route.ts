import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const shareRecipeSchema = z.object({
  isPublic: z.boolean().optional(),
  shareWithEmail: z.string().email().optional(),
});

// GET /api/recipes/[id]/share – retrieve sharing status for a recipe
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [session, { id }] = await Promise.all([auth(), params]);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        sharedWith: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    if (recipe.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      isPublic: recipe.isPublic,
      sharedWith: recipe.sharedWith.map((s) => s.user),
    });
  } catch (error) {
    console.error("Error fetching recipe sharing:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/recipes/[id]/share – update visibility or share with a specific user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [session, { id }, body] = await Promise.all([
      auth(),
      params,
      request.json(),
    ]);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recipe = await prisma.recipe.findUnique({ where: { id } });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    if (recipe.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const validatedData = shareRecipeSchema.parse(body);

    // Toggle public visibility if requested
    if (typeof validatedData.isPublic === "boolean") {
      await prisma.recipe.update({
        where: { id },
        data: { isPublic: validatedData.isPublic },
      });
    }

    // Share with a specific user by email
    if (validatedData.shareWithEmail) {
      const targetUser = await prisma.user.findUnique({
        where: { email: validatedData.shareWithEmail },
      });

      if (!targetUser) {
        return NextResponse.json(
          { error: "User not found with that email address" },
          { status: 404 }
        );
      }

      if (targetUser.id === session.user.id) {
        return NextResponse.json(
          { error: "You cannot share a recipe with yourself" },
          { status: 400 }
        );
      }

      // Upsert to avoid duplicates
      await prisma.sharedRecipe.upsert({
        where: { recipeId_sharedWith: { recipeId: id, sharedWith: targetUser.id } },
        create: { recipeId: id, sharedWith: targetUser.id },
        update: {},
      });
    }

    // Return updated sharing state
    const updated = await prisma.recipe.findUnique({
      where: { id },
      include: {
        sharedWith: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
      },
    });

    return NextResponse.json({
      isPublic: updated!.isPublic,
      sharedWith: updated!.sharedWith.map((s) => s.user),
    });
  } catch (error) {
    console.error("Error sharing recipe:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/recipes/[id]/share – unshare from a specific user or make private
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [session, { id }, body] = await Promise.all([
      auth(),
      params,
      request.json().catch(() => ({})),
    ]);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recipe = await prisma.recipe.findUnique({ where: { id } });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    if (recipe.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { removeUserId } = body as { removeUserId?: string };

    if (removeUserId) {
      // Remove sharing with a specific user
      await prisma.sharedRecipe.deleteMany({
        where: { recipeId: id, sharedWith: removeUserId },
      });
    } else {
      // Remove all shares and make private
      await Promise.all([
        prisma.recipe.update({ where: { id }, data: { isPublic: false } }),
        prisma.sharedRecipe.deleteMany({ where: { recipeId: id } }),
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unsharing recipe:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
