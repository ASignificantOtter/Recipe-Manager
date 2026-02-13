import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createMealPlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

// Cache user meal plans for per-request deduplication
const getUserMealPlans = cache(async (userId: string) => {
  return prisma.mealPlan.findMany({
    where: { userId },
    include: {
      days: {
        include: {
          recipes: {
            include: { recipe: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mealPlans = await getUserMealPlans(session.user.id);

    return NextResponse.json(mealPlans);
  } catch (error) {
    console.error("Error fetching meal plans:", error);
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

    const validatedData = createMealPlanSchema.parse(body);

    const mealPlan = await prisma.mealPlan.create({
      data: {
        userId: session.user.id,
        name: validatedData.name,
        description: validatedData.description,
        startDate: new Date(validatedData.startDate),
        endDate: new Date(validatedData.endDate),
        // Create days for the week by default (simple: assign recipes to days of week)
        days: {
          create: [
            { dayOfWeek: "monday" },
            { dayOfWeek: "tuesday" },
            { dayOfWeek: "wednesday" },
            { dayOfWeek: "thursday" },
            { dayOfWeek: "friday" },
            { dayOfWeek: "saturday" },
            { dayOfWeek: "sunday" },
          ],
        },
      },
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

    return NextResponse.json(mealPlan, { status: 201 });
  } catch (error) {
    console.error("Error creating meal plan:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
