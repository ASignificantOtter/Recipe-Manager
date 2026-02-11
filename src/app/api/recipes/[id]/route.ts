import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateRecipeSchema = z.object({
  name: z.string().min(1).optional(),
  instructions: z.string().min(1).optional(),
  prepTime: z.number().nullable().optional(),
  cookTime: z.number().nullable().optional(),
  servings: z.number().nullable().optional(),
  notes: z.string().optional(),
  dietaryTags: z.array(z.string()).optional(),
  ingredients: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        quantity: z.number(),
        unit: z.string(),
        notes: z.string().optional(),
      })
    )
    .optional(),
});

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

    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: { ingredients: true },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Verify ownership
    if (recipe.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(recipe);
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const recipe = await prisma.recipe.findUnique({ where: { id } });
    if (!recipe || recipe.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ingredients, ...recipeData } = body;
    
    const validatedData = updateRecipeSchema.parse({ ...recipeData, ingredients });

    // Update recipe
    const updatedRecipe = await prisma.recipe.update({
      where: { id },
      data: {
        name: validatedData.name,
        instructions: validatedData.instructions,
        prepTime: validatedData.prepTime,
        cookTime: validatedData.cookTime,
        servings: validatedData.servings,
        notes: validatedData.notes,
        dietaryTags: validatedData.dietaryTags,
      },
      include: { ingredients: true },
    });

    // Handle ingredients if provided
    if (validatedData.ingredients) {
      // Delete ingredients that are not in the updated list
      const newIngredientIds = validatedData.ingredients
        .filter((ing) => ing.id)
        .map((ing) => ing.id as string);
      
      await prisma.recipeIngredient.deleteMany({
        where: {
          recipeId: id,
          id: { notIn: newIngredientIds },
        },
      });

      // Upsert ingredients
      for (const ingredient of validatedData.ingredients) {
        if (ingredient.id) {
          // Update existing ingredient
          await prisma.recipeIngredient.update({
            where: { id: ingredient.id },
            data: {
              name: ingredient.name,
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              notes: ingredient.notes,
            },
          });
        } else {
          // Create new ingredient
          await prisma.recipeIngredient.create({
            data: {
              recipeId: id,
              name: ingredient.name,
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              notes: ingredient.notes,
            },
          });
        }
      }
    }

    // Fetch updated recipe with ingredients
    const finalRecipe = await prisma.recipe.findUnique({
      where: { id },
      include: { ingredients: true },
    });

    return NextResponse.json(finalRecipe);
  } catch (error) {
    console.error("Error updating recipe:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const recipe = await prisma.recipe.findUnique({ where: { id } });
    if (!recipe || recipe.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.recipe.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting recipe:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
