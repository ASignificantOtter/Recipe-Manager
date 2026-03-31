import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const addCollaboratorSchema = z.object({
  email: z.string().email(),
  role: z.enum(["viewer", "editor"]).default("viewer"),
});

// GET /api/meal-plans/[id]/collaborators – list all collaborators for a meal plan
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [session, { id }] = await Promise.all([auth(), params]);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mealPlan = await prisma.mealPlan.findUnique({ where: { id } });

    if (!mealPlan) {
      return NextResponse.json({ error: "Meal plan not found" }, { status: 404 });
    }

    // Only owner can manage collaborators
    if (mealPlan.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const collaborators = await prisma.mealPlanCollaborator.findMany({
      where: { mealPlanId: id },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      collaborators.map((c) => ({
        id: c.id,
        role: c.role,
        user: c.user,
        createdAt: c.createdAt,
      }))
    );
  } catch (error) {
    console.error("Error fetching collaborators:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/meal-plans/[id]/collaborators – add a collaborator by email
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

    const mealPlan = await prisma.mealPlan.findUnique({ where: { id } });

    if (!mealPlan) {
      return NextResponse.json({ error: "Meal plan not found" }, { status: 404 });
    }

    if (mealPlan.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const validatedData = addCollaboratorSchema.parse(body);

    const targetUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found with that email address" },
        { status: 404 }
      );
    }

    if (targetUser.id === session.user.id) {
      return NextResponse.json(
        { error: "You cannot add yourself as a collaborator" },
        { status: 400 }
      );
    }

    const collaborator = await prisma.mealPlanCollaborator.upsert({
      where: { mealPlanId_userId: { mealPlanId: id, userId: targetUser.id } },
      create: {
        mealPlanId: id,
        userId: targetUser.id,
        role: validatedData.role,
      },
      update: { role: validatedData.role },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    return NextResponse.json(
      {
        id: collaborator.id,
        role: collaborator.role,
        user: collaborator.user,
        createdAt: collaborator.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding collaborator:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
