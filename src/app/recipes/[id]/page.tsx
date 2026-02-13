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
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <p className="text-[var(--foreground)] opacity-60">Loading...</p>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <nav className="border-b-2 border-[var(--border)] bg-white shadow-sm dark:bg-slate-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="h-16 flex items-center">
              <Link href="/recipes" className="text-[var(--primary)] font-semibold hover:text-[var(--primary-dark)] transition-colors">
                ← Back to Recipes
              </Link>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-4xl py-8 px-4">
          <div className="rounded-lg border-l-4 border-[var(--error)] bg-red-50 dark:bg-red-950 p-4">
            <p className="text-sm font-semibold text-[var(--error)]">
              {error || "Recipe not found"}
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <nav className="border-b-2 border-[var(--border)] bg-white shadow-sm dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/recipes" className="text-[var(--primary)] font-semibold hover:text-[var(--primary-dark)] transition-colors">
                ← Back to Recipes
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href={`/recipes/${id}/edit`}
                className="text-[var(--primary)] font-semibold hover:text-[var(--primary-dark)] transition-colors"
              >
                Edit
              </Link>
              <button
                onClick={handleDelete}
                className="text-[var(--error)] font-semibold hover:text-[var(--accent-dark)] transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 border-[var(--border)] p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-[var(--foreground)]">{recipe.name}</h1>
            {recipe.dietaryTags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {recipe.dietaryTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-[var(--primary)]/15 px-4 py-1 text-xs font-semibold text-[var(--primary)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-6 mb-8 pb-8 border-b-2 border-[var(--border)]">
            {recipe.prepTime && (
              <div className="bg-[var(--primary)]/5 rounded-lg p-4">
                <p className="text-sm text-[var(--foreground)] opacity-70 font-semibold">⏱ Prep Time</p>
                <p className="text-2xl font-bold text-[var(--primary)] mt-1">{recipe.prepTime} min</p>
              </div>
            )}
            {recipe.cookTime && (
              <div className="bg-[var(--accent)]/5 rounded-lg p-4">
                <p className="text-sm text-[var(--foreground)] opacity-70 font-semibold">🔥 Cook Time</p>
                <p className="text-2xl font-bold text-[var(--accent)] mt-1">{recipe.cookTime} min</p>
              </div>
            )}
            {recipe.servings && (
              <div className="bg-[var(--primary)]/5 rounded-lg p-4">
                <p className="text-sm text-[var(--foreground)] opacity-70 font-semibold">🍽 Servings</p>
                <p className="text-2xl font-bold text-[var(--primary)] mt-1">{recipe.servings}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6">Ingredients</h2>
              <ul className="space-y-3">
                {recipe.ingredients.map((ingredient) => (
                  <li key={ingredient.id} className="bg-[var(--primary)]/5 rounded-lg p-4 text-[var(--foreground)]">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-[var(--primary)]">{ingredient.quantity}</span>
                      <span className="font-semibold text-[var(--primary)]">{ingredient.unit}</span>
                      <span className="font-medium">{ingredient.name}</span>
                    </div>
                    {ingredient.notes && (
                      <span className="text-[var(--foreground)] opacity-60 text-sm mt-1 block"> ({ingredient.notes})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6">Instructions</h2>
              <div className="bg-[var(--accent)]/5 rounded-lg p-6 text-[var(--foreground)]">
                <p className="whitespace-pre-wrap leading-relaxed">
                  {recipe.instructions}
                </p>
              </div>
              {recipe.notes && (
                <div className="mt-6 pt-6 border-t-2 border-[var(--border)]">
                  <p className="text-sm text-[var(--foreground)] opacity-70 font-semibold">📝 Notes</p>
                  <p className="mt-3 text-[var(--foreground)]">{recipe.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
