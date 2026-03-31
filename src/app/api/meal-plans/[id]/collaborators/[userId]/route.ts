import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// DELETE /api/meal-plans/[id]/collaborators/[userId] – remove a collaborator
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const [session, { id, userId }] = await Promise.all([auth(), params]);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mealPlan = await prisma.mealPlan.findUnique({ where: { id } });

    if (!mealPlan) {
      return NextResponse.json({ error: "Meal plan not found" }, { status: 404 });
    }

    // Only the owner can remove collaborators
    if (mealPlan.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.mealPlanCollaborator.deleteMany({
      where: { mealPlanId: id, userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing collaborator:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
