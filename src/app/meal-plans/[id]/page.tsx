"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";

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
  const router = useRouter();
  const id = params.id as string;
  
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [mealPlanRes, recipesRes] = await Promise.all([
        fetch(`/api/meal-plans/${id}`),
        fetch("/api/recipes"),
      ]);

      if (!mealPlanRes.ok || !recipesRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const mealPlanData = await mealPlanRes.json();
      const recipesData = await recipesRes.json();

      setMealPlan(mealPlanData);
      setRecipes(recipesData);
    } catch (err) {
      setError("Failed to load meal plan");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRecipe = async () => {
    if (!selectedDay || !selectedRecipe) {
      setError("Please select a day and recipe");
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

      setSelectedDay(null);
      setSelectedRecipe(null);
      await fetchData();
    } catch (err) {
      setError("Failed to add recipe");
      console.error(err);
    }
  };

  const handleRemoveRecipe = async (recipeId: string) => {
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

      await fetchData();
    } catch (err) {
      setError("Failed to remove recipe");
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error || !mealPlan) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="h-16 flex items-center">
              <Link href="/meal-plans" className="text-blue-600 hover:text-blue-800">
                ← Back to Meal Plans
              </Link>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-7xl py-8 px-4">
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">
              {error || "Meal plan not found"}
            </p>
          </div>
        </main>
      </div>
    );
  }

  const sortedDays = mealPlan.days.sort(
    (a, b) => DAYS_ORDER.indexOf(a.dayOfWeek) - DAYS_ORDER.indexOf(b.dayOfWeek)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/meal-plans" className="text-blue-600 hover:text-blue-800">
                ← Back to Meal Plans
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href={`/meal-plans/${id}/shopping-list`}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Shopping List
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">{mealPlan.name}</h1>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Add Recipe to Meal Plan</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Day
              </label>
              <select
                value={selectedDay || ""}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Choose a day...</option>
                {sortedDays.map((day) => (
                  <option key={day.id} value={day.dayOfWeek}>
                    {day.dayOfWeek.charAt(0).toUpperCase() + day.dayOfWeek.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Recipe
              </label>
              <select
                value={selectedRecipe || ""}
                onChange={(e) => setSelectedRecipe(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Choose a recipe...</option>
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleAddRecipe}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add Recipe
            </button>
          </div>
        </div>

        <div className="grid gap-6">
          {sortedDays.map((day) => (
            <div key={day.id} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-4 capitalize">
                {day.dayOfWeek}
              </h3>
              {day.recipes.length === 0 ? (
                <p className="text-gray-500">No recipes assigned</p>
              ) : (
                <ul className="space-y-3">
                  {day.recipes.map((mealPlanRecipe) => (
                    <li
                      key={mealPlanRecipe.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded"
                    >
                      <span className="font-medium">{mealPlanRecipe.recipe.name}</span>
                      <button
                        onClick={() => handleRemoveRecipe(mealPlanRecipe.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
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
      </main>
    </div>
  );
}
