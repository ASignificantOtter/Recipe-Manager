import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateMealPlanSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

const addRecipeSchema = z.object({
  dayOfWeek: z.string(),
  recipeId: z.string(),
  serveCount: z.number().default(1),
  notes: z.string().optional(),
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

    const mealPlan = await prisma.mealPlan.findUnique({
      where: { id },
      include: {
        days: {
          include: {
            recipes: {
              include: { recipe: true },
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

    return NextResponse.json(mealPlan);
  } catch (error) {
    console.error("Error fetching meal plan:", error);
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

    const mealPlan = await prisma.mealPlan.findUnique({ where: { id } });
    if (!mealPlan || mealPlan.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateMealPlanSchema.parse(body);

    const updatedMealPlan = await prisma.mealPlan.update({
      where: { id },
      data: validatedData,
      include: {
        days: {
          include: {
            recipes: {
              include: { recipe: true },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedMealPlan);
  } catch (error) {
    console.error("Error updating meal plan:", error);
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

    const mealPlan = await prisma.mealPlan.findUnique({ where: { id } });
    if (!mealPlan || mealPlan.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.mealPlan.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting meal plan:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const mealPlan = await prisma.mealPlan.findUnique({ where: { id } });
    if (!mealPlan || mealPlan.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    if (action === "addRecipe") {
      const validatedData = addRecipeSchema.parse(data);
      
      // Find the day
      const day = await prisma.mealPlanDay.findFirst({
        where: { mealPlanId: id, dayOfWeek: validatedData.dayOfWeek },
      });

      if (!day) {
        return NextResponse.json({ error: "Day not found" }, { status: 404 });
      }

      // Add recipe to day
      const mealPlanRecipe = await prisma.mealPlanRecipe.create({
        data: {
          mealPlanDayId: day.id,
          recipeId: validatedData.recipeId,
          serveCount: validatedData.serveCount,
          notes: validatedData.notes,
        },
        include: { recipe: true },
      });

      return NextResponse.json(mealPlanRecipe, { status: 201 });
    }

    if (action === "removeRecipe") {
      const { recipeId } = data;
      await prisma.mealPlanRecipe.delete({
        where: { id: recipeId },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error patching meal plan:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
