import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { calculateRecipeNutrition, scaleNutritionForServings } from "@/lib/nutrition/calculate";

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
      include: { ingredients: true },
    });
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    if (recipe.userId !== session.user.id) {
      const isPublic = recipe.isPublic === true;
      const shareRecord = isPublic
        ? null
        : await prisma.sharedRecipe.findUnique({
            where: { recipeId_sharedWith: { recipeId: id, sharedWith: session.user.id } },
          });
      if (!isPublic && !shareRecord) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const safeIngredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    const nutrition = calculateRecipeNutrition(safeIngredients, recipe.servings);
    const targetServingsParam = Number(new URL(request.url).searchParams.get("targetServings"));
    const scaled =
      Number.isFinite(targetServingsParam) && targetServingsParam > 0
        ? scaleNutritionForServings(nutrition, targetServingsParam)
        : null;

    return NextResponse.json({ nutrition, scaled });
  } catch (error) {
    console.error("Error calculating recipe nutrition:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
