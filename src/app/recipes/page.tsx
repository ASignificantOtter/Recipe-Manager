"use client";

import { useCallback, memo, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useRecipes } from "@/lib/hooks/useSWR";

interface Recipe {
  id: string;
  name: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  dietaryTags: string[];
  createdAt: string;
}

// Memoized RecipeCard component to prevent unnecessary re-renders
const RecipeCard = memo(({ recipe, onDelete, onNavigate }: {
  recipe: Recipe;
  onDelete: (id: string) => void;
  onNavigate: (id: string) => void;
}) => (
  <div
    onClick={() => onNavigate(recipe.id)}
    className="rounded-lg border-2 border-[var(--border)] bg-white dark:bg-slate-800 p-6 hover:border-[var(--primary)] hover:shadow-lg transition-all cursor-pointer group cv-card"
  >
    <div className="flex justify-between items-start mb-4">
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
          {recipe.name}
        </h3>
        {recipe.dietaryTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {recipe.dietaryTags.map((tag: string) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-[var(--primary)]/15 px-3 py-1 text-xs font-medium text-[var(--primary)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-3 ml-4" onClick={(e) => e.stopPropagation()}>
        <Link
          href={`/recipes/${recipe.id}/edit`}
          className="text-[var(--primary)] hover:text-[var(--primary-dark)] text-sm font-medium transition-colors"
        >
          Edit
        </Link>
        <button
          onClick={() => onDelete(recipe.id)}
          className="text-[var(--error)] hover:text-[var(--accent-dark)] text-sm font-medium transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
    <div className="flex gap-6 text-sm text-[var(--foreground)] opacity-60">
      {recipe.prepTime && <span>⏱ Prep: {recipe.prepTime} min</span>}
      {recipe.cookTime && <span>🔥 Cook: {recipe.cookTime} min</span>}
      {recipe.servings && <span>🍽 Servings: {recipe.servings}</span>}
    </div>
  </div>
));
RecipeCard.displayName = "RecipeCard";

export default function RecipesPage() {
  const router = useRouter();
  const { recipes, isLoading, isError, mutate } = useRecipes();
  const { data: session } = useSession();

  const handleDeleteRecipe = useCallback(async (id: string) => {
    if (!confirm("Are you sure you want to delete this recipe?")) return;

    // Optimistic update
    const optimisticRecipes = recipesList.filter((r: Recipe) => r.id !== id);
    mutate(optimisticRecipes, { revalidate: false });

    try {
      const response = await fetch(`/api/recipes/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete recipe");
      }

      // Revalidate after successful delete
      mutate();
    } catch (err) {
      console.error(err);
      // Revert on error
      mutate();
    }
  }, [recipes, mutate]);

  const handleNavigate = useCallback((id: string) => {
    router.push(`/recipes/${id}`);
  }, [router]);

  const handleSignOut = useCallback(() => {
    signOut();
  }, []);

  const error = isError ? "Failed to load recipes" : null;
  const recipesList: Recipe[] = recipes || [];

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
                href="/recipes/new"
                className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] active:scale-95"
              >
                + Add Recipe
              </Link>
              {/** Show upload only to authenticated users */}
              {session?.user && (
                <Link
                  href="/recipes/upload"
                  className="rounded-lg border-2 border-[var(--border)] bg-[var(--input-bg)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 active:scale-95 transition-all"
                >
                  Upload
                </Link>
              )}
              <Link
                href="/meal-plans"
                className="text-[var(--foreground)] font-medium hover:text-[var(--primary)] transition-colors"
              >
                Meal Plans
              </Link>
              <button
                onClick={handleSignOut}
                className="text-[var(--foreground)] font-medium hover:text-[var(--accent)] transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-[var(--foreground)]">Your Recipes</h2>
          <p className="mt-2 text-[var(--foreground)] opacity-70">
            {recipesList.length > 0
              ? `You have ${recipesList.length} recipe${recipesList.length !== 1 ? "s" : ""}`
              : "No recipes yet."}
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
              <p className="text-[var(--foreground)] opacity-60">Loading recipes...</p>
            </div>
          )}
        >
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-[var(--foreground)] opacity-60">Loading recipes...</p>
            </div>
          ) : recipesList.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-[var(--border)] bg-gradient-to-br from-[var(--primary)]/5 to-[var(--accent)]/5 p-12 text-center">
              <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">No recipes yet</h3>
              <p className="mt-2 text-sm text-[var(--foreground)] opacity-60">
                Get started by creating a new recipe or uploading one from a file.
              </p>
              <div className="mt-6 flex gap-4 justify-center flex-wrap">
                <Link
                  href="/recipes/new"
                  className="rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] active:scale-95 transition-all"
                >
                  Create Recipe
                </Link>
                {session?.user && (
                  <Link
                    href="/recipes/upload"
                    className="rounded-lg border-2 border-[var(--border)] bg-[var(--input-bg)] px-5 py-2 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all"
                  >
                    Upload Recipe
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
              {recipesList.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onDelete={handleDeleteRecipe}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          )}
        </Suspense>
      </main>
    </div>
  );
}
