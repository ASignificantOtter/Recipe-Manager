"use client";

import { useCallback, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMealPlan, useRecipes } from "@/lib/hooks/useSWR";

interface Recipe {
  id: string;
  name: string;
}

interface MealPlanRecipe {
  id: string;
  recipeId: string;
  recipe: Recipe;
  serveCount: number;
}

interface Day {
  id: string;
  dayOfWeek: string;
  recipes: MealPlanRecipe[];
}

interface MealPlan {
  id: string;
  name: string;
  days: Day[];
}

const DAYS_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function MealPlanDetailPage() {
  const params = useParams();
  const id = params.id as string;
  
  const { mealPlan, isLoading: mealPlanLoading, isError: mealPlanError, mutate } = useMealPlan(id);
  const { recipes, isLoading: recipesLoading } = useRecipes();

  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedRecipe, setSelectedRecipe] = useState<string>("");

  const isLoading = mealPlanLoading || recipesLoading;
  const error = mealPlanError ? "Failed to load meal plan" : null;

  const handleAddRecipe = useCallback(async () => {
    if (!selectedDay || !selectedRecipe) {
      return;
    }

    try {
      const response = await fetch(`/api/meal-plans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addRecipe",
          dayOfWeek: selectedDay,
          recipeId: selectedRecipe,
          serveCount: 1,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add recipe");
      }

      setSelectedDay("");
      setSelectedRecipe("");
      mutate();
    } catch (err) {
      console.error(err);
    }
  }, [id, selectedDay, selectedRecipe, mutate]);

  const handleRemoveRecipe = useCallback(async (recipeId: string) => {
    try {
      const response = await fetch(`/api/meal-plans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "removeRecipe",
          recipeId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove recipe");
      }

      mutate();
    } catch (err) {
      console.error(err);
    }
  }, [id, mutate]);

  const sortedDays = useMemo(() => {
    if (!mealPlan) return [];
    return [...mealPlan.days].sort(
      (a: Day, b: Day) => DAYS_ORDER.indexOf(a.dayOfWeek) - DAYS_ORDER.indexOf(b.dayOfWeek)
    );
  }, [mealPlan]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <p className="text-[var(--foreground)] opacity-60">Loading...</p>
      </div>
    );
  }

  if (error || !mealPlan) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <nav className="border-b-2 border-[var(--border)] bg-white shadow-sm dark:bg-slate-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="h-16 flex items-center">
              <Link href="/meal-plans" className="text-[var(--primary)] font-semibold hover:text-[var(--primary-dark)] transition-colors">
                ← Back to Meal Plans
              </Link>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-7xl py-8 px-4">
          <div className="rounded-lg border-l-4 border-[var(--error)] bg-red-50 dark:bg-red-950 p-4">
            <p className="text-sm font-semibold text-[var(--error)]">
              {error || "Meal plan not found"}
            </p>
          </div>
        </main>
      </div>
    );
  }

  const recipesList: Recipe[] = recipes || [];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <nav className="border-b-2 border-[var(--border)] bg-white shadow-sm dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/meal-plans" className="text-[var(--primary)] font-semibold hover:text-[var(--primary-dark)] transition-colors">
                ← Back to Meal Plans
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href={`/meal-plans/${id}/shopping-list`}
                className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] active:scale-95"
              >
                🛒 Shopping List
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[var(--foreground)]">{mealPlan.name}</h1>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border-l-4 border-[var(--error)] bg-red-50 dark:bg-red-950 p-4">
            <p className="text-sm font-semibold text-[var(--error)]">{error}</p>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 border-[var(--border)] p-6 mb-8">
          <h2 className="text-lg font-semibold mb-6 text-[var(--foreground)]">Add Recipe to Meal Plan</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                Select Day
              </label>
              <select
                value={selectedDay || ""}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="block w-full rounded-lg border-2 border-[var(--border)] px-4 py-2 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
              >
                <option value="">Choose a day...</option>
                {sortedDays.map((day: Day) => (
                  <option key={day.id} value={day.dayOfWeek}>
                    {day.dayOfWeek.charAt(0).toUpperCase() + day.dayOfWeek.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                Select Recipe
              </label>
              <select
                value={selectedRecipe || ""}
                onChange={(e) => setSelectedRecipe(e.target.value)}
                className="block w-full rounded-lg border-2 border-[var(--border)] px-4 py-2 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
              >
                <option value="">Choose a recipe...</option>
                {recipesList.map((recipe: Recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleAddRecipe}
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] active:scale-95 transition-all"
            >
              + Add Recipe
            </button>
          </div>
        </div>

        <Suspense
          fallback={(
            <div className="text-center py-12">
              <p className="text-[var(--foreground)] opacity-60">Loading meal plan days...</p>
            </div>
          )}
        >
          <div className="grid gap-6">
            {sortedDays.map((day: Day) => (
              <div key={day.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 border-[var(--border)] p-6 cv-section">
                <h3 className="text-xl font-semibold mb-6 text-[var(--foreground)] capitalize">
                  📅 {day.dayOfWeek}
                </h3>
                {day.recipes.length === 0 ? (
                  <p className="text-[var(--foreground)] opacity-60">No recipes assigned</p>
                ) : (
                  <ul className="space-y-3">
                    {day.recipes.map((mealPlanRecipe: MealPlanRecipe) => (
                      <li
                        key={mealPlanRecipe.id}
                        className="flex justify-between items-center p-4 bg-[var(--primary)]/5 rounded-lg border border-[var(--border)] hover:border-[var(--primary)] transition-all cv-item"
                      >
                        <span className="font-semibold text-[var(--foreground)]">{mealPlanRecipe.recipe.name}</span>
                        <button
                          onClick={() => handleRemoveRecipe(mealPlanRecipe.id)}
                          className="text-[var(--error)] hover:text-[var(--accent-dark)] text-sm font-semibold transition-colors"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Suspense>
      </main>
    </div>
  );
}
