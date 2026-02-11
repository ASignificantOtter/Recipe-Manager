"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface MealPlan {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  days: Array<{
    id: string;
    dayOfWeek: string;
    recipes: Array<{
      id: string;
    }>;
  }>;
}

export default function MealPlansPage() {
  const router = useRouter();
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMealPlans();
  }, []);

  const fetchMealPlans = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/meal-plans");
      
      if (response.status === 401) {
        router.push("/auth/signin");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch meal plans");
      }

      const data = await response.json();
      setMealPlans(data);
    } catch (err) {
      setError("Failed to load meal plans");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMealPlan = async (id: string) => {
    if (!confirm("Are you sure you want to delete this meal plan?")) return;

    try {
      const response = await fetch(`/api/meal-plans/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete meal plan");
      }

      setMealPlans(mealPlans.filter((m) => m.id !== id));
    } catch (err) {
      setError("Failed to delete meal plan");
      console.error(err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold">Recipe Repository</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/meal-plans/new"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Create Meal Plan
              </Link>
              <Link
                href="/recipes"
                className="text-gray-600 hover:text-gray-900"
              >
                Recipes
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">Meal Plans</h2>
          <p className="mt-2 text-gray-600">
            {mealPlans.length > 0
              ? `You have ${mealPlans.length} meal plan${mealPlans.length !== 1 ? "s" : ""}`
              : "No meal plans yet."}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading meal plans...</p>
          </div>
        ) : mealPlans.length === 0 ? (
          <div className="rounded-md border-2 border-dashed border-gray-300 p-12 text-center">
            <h3 className="mt-2 text-lg font-medium text-gray-900">No meal plans yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Create a meal plan to start planning your weekly meals.
            </p>
            <div className="mt-6">
              <Link
                href="/meal-plans/new"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Create Meal Plan
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
            {mealPlans.map((mealPlan) => {
              const totalRecipes = mealPlan.days.reduce(
                (sum, day) => sum + day.recipes.length,
                0
              );

              return (
                <div
                  key={mealPlan.id}
                  className="rounded-lg border border-gray-200 bg-white p-6 hover:shadow-lg transition"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {mealPlan.name}
                      </h3>
                      {mealPlan.description && (
                        <p className="mt-1 text-sm text-gray-600">
                          {mealPlan.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/meal-plans/${mealPlan.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleDeleteMealPlan(mealPlan.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>
                      {formatDate(mealPlan.startDate)} -{" "}
                      {formatDate(mealPlan.endDate)}
                    </p>
                    <p>{totalRecipes} recipes assigned</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
