import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildRecipeWhereClause, type RecipeFilters } from "@/lib/utils/recipeFilters";

const createRecipeSchema = z.object({
  name: z.string().min(1),
  instructions: z.string().min(1),
  prepTime: z.number().optional(),
  cookTime: z.number().optional(),
  servings: z.number().optional(),
  notes: z.string().optional(),
  dietaryTags: z.array(z.string()).optional(),
  ingredients: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      unit: z.string(),
      canonicalQuantity: z.number().optional(),
      canonicalUnit: z.string().optional(),
      notes: z.string().optional(),
    })
  ),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filters: RecipeFilters = {
      search: searchParams.get("search") ?? undefined,
      tags: searchParams.getAll("tags").filter(Boolean),
      maxPrepTime: searchParams.get("maxPrepTime")
        ? Number(searchParams.get("maxPrepTime"))
        : undefined,
      maxCookTime: searchParams.get("maxCookTime")
        ? Number(searchParams.get("maxCookTime"))
        : undefined,
    };

    const where = buildRecipeWhereClause(session.user.id, filters);

    const recipes = await prisma.recipe.findMany({
      where,
      include: { ingredients: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(recipes);
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parallelize auth and body parsing
    const [session, body] = await Promise.all([
      auth(),
      request.json(),
    ]);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const validatedData = createRecipeSchema.parse(body);

    const recipe = await prisma.recipe.create({
      data: {
        userId: session.user.id,
        name: validatedData.name,
        instructions: validatedData.instructions,
        prepTime: validatedData.prepTime,
        cookTime: validatedData.cookTime,
        servings: validatedData.servings,
        notes: validatedData.notes,
        dietaryTags: validatedData.dietaryTags || [],
        ingredients: {
          create: validatedData.ingredients.map((ing) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            notes: ing.notes,
            canonicalQuantity: ing.canonicalQuantity,
            canonicalUnit: ing.canonicalUnit,
          })),
        },
      },
      include: { ingredients: true },
    });

    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    console.error("Error creating recipe:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
