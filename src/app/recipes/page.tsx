"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

interface Recipe {
  id: string;
  name: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  dietaryTags: string[];
  createdAt: string;
}

export default function RecipesPage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/recipes");
      
      if (response.status === 401) {
        router.push("/auth/signin");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch recipes");
      }

      const data = await response.json();
      setRecipes(data);
    } catch (err) {
      setError("Failed to load recipes");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (!confirm("Are you sure you want to delete this recipe?")) return;

    try {
      const response = await fetch(`/api/recipes/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete recipe");
      }

      setRecipes(recipes.filter((r) => r.id !== id));
    } catch (err) {
      setError("Failed to delete recipe");
      console.error(err);
    }
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
                href="/recipes/new"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Add Recipe
              </Link>
              <Link
                href="/meal-plans"
                className="text-gray-600 hover:text-gray-900"
              >
                Meal Plans
              </Link>
              <button
                onClick={() => signOut()}
                className="text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">Your Recipes</h2>
          <p className="mt-2 text-gray-600">
            {recipes.length > 0
              ? `You have ${recipes.length} recipe${recipes.length !== 1 ? "s" : ""}`
              : "No recipes yet."}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading recipes...</p>
          </div>
        ) : recipes.length === 0 ? (
          <div className="rounded-md border-2 border-dashed border-gray-300 p-12 text-center">
            <h3 className="mt-2 text-lg font-medium text-gray-900">No recipes yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Get started by creating a new recipe or uploading one from a file.
            </p>
            <div className="mt-6 flex gap-4 justify-center">
              <Link
                href="/recipes/new"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Create Recipe
              </Link>
              <Link
                href="/recipes/upload"
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Upload Recipe
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
            {recipes.map((recipe) => (
              <div
                key={recipe.id}
                className="rounded-lg border border-gray-200 bg-white p-6 hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {recipe.name}
                    </h3>
                    {recipe.dietaryTags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {recipe.dietaryTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/recipes/${recipe.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDeleteRecipe(recipe.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="flex gap-6 text-sm text-gray-600">
                  {recipe.prepTime && <span>Prep: {recipe.prepTime} min</span>}
                  {recipe.cookTime && <span>Cook: {recipe.cookTime} min</span>}
                  {recipe.servings && <span>Servings: {recipe.servings}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
