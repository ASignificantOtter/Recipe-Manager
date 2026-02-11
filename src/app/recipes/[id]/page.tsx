"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";

interface Recipe {
  id: string;
  name: string;
  instructions: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  notes?: string;
  dietaryTags: string[];
  ingredients: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
}

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecipe();
  }, [id]);

  const fetchRecipe = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/recipes/${id}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch recipe");
      }

      const data = await response.json();
      setRecipe(data);
    } catch (err) {
      setError("Failed to load recipe");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this recipe?")) return;

    try {
      const response = await fetch(`/api/recipes/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete recipe");
      }

      router.push("/recipes");
    } catch (err) {
      setError("Failed to delete recipe");
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

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="h-16 flex items-center">
              <Link href="/recipes" className="text-blue-600 hover:text-blue-800">
                ← Back to Recipes
              </Link>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-4xl py-8 px-4">
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">
              {error || "Recipe not found"}
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/recipes" className="text-blue-600 hover:text-blue-800">
                ← Back to Recipes
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleDelete}
                className="text-red-600 hover:text-red-800 font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="mb-6">
            <h1 className="text-4xl font-bold">{recipe.name}</h1>
            {recipe.dietaryTags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
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

          <div className="grid grid-cols-3 gap-6 mb-8 pb-8 border-b">
            {recipe.prepTime && (
              <div>
                <p className="text-sm text-gray-600">Prep Time</p>
                <p className="text-lg font-semibold">{recipe.prepTime} min</p>
              </div>
            )}
            {recipe.cookTime && (
              <div>
                <p className="text-sm text-gray-600">Cook Time</p>
                <p className="text-lg font-semibold">{recipe.cookTime} min</p>
              </div>
            )}
            {recipe.servings && (
              <div>
                <p className="text-sm text-gray-600">Servings</p>
                <p className="text-lg font-semibold">{recipe.servings}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">Ingredients</h2>
              <ul className="space-y-2">
                {recipe.ingredients.map((ingredient) => (
                  <li key={ingredient.id} className="text-gray-700">
                    <span className="font-semibold">{ingredient.quantity}</span>
                    {" "}
                    <span className="font-semibold">{ingredient.unit}</span>
                    {" "}
                    {ingredient.name}
                    {ingredient.notes && (
                      <span className="text-gray-500"> ({ingredient.notes})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">Instructions</h2>
              <p className="whitespace-pre-wrap text-gray-700">
                {recipe.instructions}
              </p>
              {recipe.notes && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-gray-600 font-semibold">Notes</p>
                  <p className="mt-2 text-gray-700">{recipe.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
