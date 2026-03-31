"use client";

import { useCallback, useMemo, memo, Suspense } from "react";
import Link from "next/link";
import { useMealPlans } from "@/lib/hooks/useSWR";

interface MealPlan {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  collaboratorRole?: string;
  days: Array<{
    id: string;
    dayOfWeek: string;
    recipes: Array<{
      id: string;
    }>;
  }>;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

const MealPlanCard = memo(({
  mealPlan,
  totalRecipes,
  onDelete,
  readOnly,
}: {
  mealPlan: MealPlan;
  totalRecipes: number;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
}) => (
  <div
    className="rounded-lg border-2 border-[var(--border)] bg-white dark:bg-slate-800 p-6 hover:border-[var(--primary)] hover:shadow-lg transition-all group cv-card"
  >
    <div className="flex justify-between items-start mb-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
            {mealPlan.name}
          </h3>
          {mealPlan.collaboratorRole && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              mealPlan.collaboratorRole === "editor"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300"
            }`}>
              {mealPlan.collaboratorRole === "editor" ? "✏️ Editor" : "👁 Viewer"}
            </span>
          )}
        </div>
        {mealPlan.description && (
          <p className="mt-2 text-sm text-[var(--foreground)] opacity-60">
            {mealPlan.description}
          </p>
        )}
      </div>
      <div className="flex gap-3 ml-4">
        <Link
          href={`/meal-plans/${mealPlan.id}`}
          className="text-[var(--primary)] hover:text-[var(--primary-dark)] text-sm font-medium transition-colors"
        >
          View
        </Link>
        {!readOnly && onDelete && (
          <button
            onClick={() => onDelete(mealPlan.id)}
            className="text-[var(--error)] hover:text-[var(--accent-dark)] text-sm font-medium transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
    <div className="space-y-2 text-sm text-[var(--foreground)] opacity-60">
      <p>📅 {formatDate(mealPlan.startDate)} – {formatDate(mealPlan.endDate)}</p>
      <p>🍽 {totalRecipes} recipes assigned</p>
    </div>
  </div>
));
MealPlanCard.displayName = "MealPlanCard";

export default function MealPlansPage() {
  const { mealPlans, sharedMealPlans, isLoading, isError, mutate } = useMealPlans();

  const mealPlansList: MealPlan[] = (mealPlans as MealPlan[] | undefined) ?? [];
  const sharedPlansList: MealPlan[] = (sharedMealPlans as MealPlan[] | undefined) ?? [];

  const mealPlansWithTotals = useMemo(() => {
    return mealPlansList.map((mealPlan: MealPlan) => ({
      mealPlan,
      totalRecipes: mealPlan.days.reduce(
        (sum, day) => sum + day.recipes.length,
        0
      ),
    }));
  }, [mealPlansList]);

  const sharedPlansWithTotals = useMemo(() => {
    return sharedPlansList.map((mealPlan: MealPlan) => ({
      mealPlan,
      totalRecipes: mealPlan.days.reduce(
        (sum, day) => sum + day.recipes.length,
        0
      ),
    }));
  }, [sharedPlansList]);

  const handleDeleteMealPlan = useCallback(async (id: string) => {
    if (!confirm("Are you sure you want to delete this meal plan?")) return;

    const optimisticMealPlans = mealPlansList.filter((m) => m.id !== id);
    mutate({ own: optimisticMealPlans, shared: sharedPlansList }, { revalidate: false });

    try {
      const response = await fetch(`/api/meal-plans/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete meal plan");
      }

      mutate();
    } catch (err) {
      console.error(err);
      mutate();
    }
  }, [mealPlansList, sharedPlansList, mutate]);

  const error = isError ? "Failed to load meal plans" : null;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <nav className="border-b-2 border-[var(--border)] bg-white shadow-sm dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-[var(--primary)]">🌿 Recipe Hub</h1>
            </div>
            <div className="flex items-center gap-6">
              <Link
                href="/meal-plans/new"
                className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] active:scale-95"
              >
                + Create Meal Plan
              </Link>
              <Link
                href="/recipes"
                className="text-[var(--foreground)] font-medium hover:text-[var(--primary)] transition-colors"
              >
                Recipes
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8 space-y-10">
        {/* My Meal Plans */}
        <section>
          <div className="mb-6">
            <h2 className="text-4xl font-bold text-[var(--foreground)]">Meal Plans</h2>
            <p className="mt-2 text-[var(--foreground)] opacity-70">
              {mealPlansList.length > 0
                ? `You have ${mealPlansList.length} meal plan${mealPlansList.length !== 1 ? "s" : ""}`
                : "No meal plans yet."}
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border-l-4 border-[var(--error)] bg-red-50 dark:bg-red-950 p-4">
              <p className="text-sm font-semibold text-[var(--error)]">{error}</p>
            </div>
          )}

          <Suspense
            fallback={(
              <div className="text-center py-12">
                <p className="text-[var(--foreground)] opacity-60">Loading meal plans...</p>
              </div>
            )}
          >
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-[var(--foreground)] opacity-60">Loading meal plans...</p>
              </div>
            ) : mealPlansList.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-[var(--border)] bg-gradient-to-br from-[var(--primary)]/5 to-[var(--accent)]/5 p-12 text-center">
                <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">No meal plans yet</h3>
                <p className="mt-2 text-sm text-[var(--foreground)] opacity-60">
                  Create a meal plan to start planning your weekly meals.
                </p>
                <div className="mt-6">
                  <Link
                    href="/meal-plans/new"
                    className="rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] active:scale-95 transition-all inline-block"
                  >
                    Create Meal Plan
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
                {mealPlansWithTotals.map(({ mealPlan, totalRecipes }) => (
                  <MealPlanCard
                    key={mealPlan.id}
                    mealPlan={mealPlan}
                    totalRecipes={totalRecipes}
                    onDelete={handleDeleteMealPlan}
                  />
                ))}
              </div>
            )}
          </Suspense>
        </section>

        {/* Shared Meal Plans */}
        {!isLoading && sharedPlansList.length > 0 && (
          <section>
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-[var(--foreground)]">👥 Shared with Me</h2>
              <p className="mt-2 text-[var(--foreground)] opacity-70">
                Meal plans others have invited you to collaborate on
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
              {sharedPlansWithTotals.map(({ mealPlan, totalRecipes }) => (
                <MealPlanCard
                  key={mealPlan.id}
                  mealPlan={mealPlan}
                  totalRecipes={totalRecipes}
                  readOnly={mealPlan.collaboratorRole === "viewer"}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
