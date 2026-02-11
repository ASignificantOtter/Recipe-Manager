import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

interface AggregatedIngredient {
  name: string;
  quantity: number;
  unit: string;
  notes?: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const mealPlan = await prisma.mealPlan.findUnique({
      where: { id },
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

    if (!mealPlan) {
      return NextResponse.json({ error: "Meal plan not found" }, { status: 404 });
    }

    if (mealPlan.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Aggregate ingredients
    const ingredientMap = new Map<string, AggregatedIngredient>();

    mealPlan.days.forEach((day) => {
      day.recipes.forEach((mealPlanRecipe) => {
        mealPlanRecipe.recipe.ingredients.forEach((ingredient) => {
          const key = `${ingredient.name.toLowerCase()}-${ingredient.unit}`;
          
          if (ingredientMap.has(key)) {
            const existing = ingredientMap.get(key)!;
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

    const shoppingList = Array.from(ingredientMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return NextResponse.json({
      mealPlanId: mealPlan.id,
      mealPlanName: mealPlan.name,
      shoppingList,
      totalItems: shoppingList.length,
    });
  } catch (error) {
    console.error("Error generating shopping list:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
