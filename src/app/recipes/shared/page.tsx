"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSharedRecipes } from "@/lib/hooks/useSWR";

interface SharedRecipe {
  id: string;
  name: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  dietaryTags: string[];
  shareType: "public" | "shared";
  user: { id: string; email: string; name?: string };
}

export default function SharedRecipesPage() {
  const { sharedRecipes, isLoading, isError } = useSharedRecipes();
  const [search, setSearch] = useState("");

  const filtered = useMemo<SharedRecipe[]>(() => {
    const all = (sharedRecipes ?? []) as SharedRecipe[];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter((r) => r.name.toLowerCase().includes(q));
  }, [sharedRecipes, search]);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <nav className="border-b-2 border-[var(--border)] bg-white shadow-sm dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center">
            <Link
              href="/recipes"
              className="text-[var(--primary)] font-semibold hover:text-[var(--primary-dark)] transition-colors"
            >
              ← Back to My Recipes
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl py-8 px-4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">🌐 Shared Recipes</h1>
            <p className="mt-1 text-sm text-[var(--foreground)] opacity-60">
              Browse public recipes and recipes shared directly with you
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shared recipes…"
            className="w-full rounded-lg border-2 border-[var(--border)] bg-white px-4 py-2 pl-10 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none dark:bg-slate-900"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground)] opacity-40">
            🔍
          </span>
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <p className="text-[var(--foreground)] opacity-60">Loading shared recipes…</p>
          </div>
        )}

        {isError && (
          <div className="rounded-lg border-l-4 border-[var(--error)] bg-red-50 dark:bg-red-950 p-4">
            <p className="text-sm font-semibold text-[var(--error)]">Failed to load shared recipes</p>
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-[var(--border)] py-16 text-center">
            <p className="text-4xl mb-3">🍽</p>
            <p className="font-semibold text-[var(--foreground)] opacity-60">
              {search ? "No recipes match your search" : "No shared recipes yet"}
            </p>
            {!search && (
              <p className="mt-1 text-sm text-[var(--foreground)] opacity-40">
                Recipes shared publicly or directly with you will appear here
              </p>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/recipes/${recipe.id}`}
              className="group rounded-xl border-2 border-[var(--border)] bg-white p-5 shadow-sm hover:border-[var(--primary)] hover:shadow-md transition-all dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors line-clamp-2">
                  {recipe.name}
                </h2>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    recipe.shareType === "public"
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  }`}
                >
                  {recipe.shareType === "public" ? "🌐 Public" : "🔗 Shared"}
                </span>
              </div>

              <p className="mt-1 text-xs text-[var(--foreground)] opacity-50">
                by {recipe.user.name ?? recipe.user.email}
              </p>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--foreground)] opacity-60">
                {recipe.prepTime != null && (
                  <span>⏱ Prep: {recipe.prepTime} min</span>
                )}
                {recipe.cookTime != null && (
                  <span>🔥 Cook: {recipe.cookTime} min</span>
                )}
                {recipe.servings != null && (
                  <span>🍴 Serves: {recipe.servings}</span>
                )}
              </div>

              {recipe.dietaryTags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {recipe.dietaryTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--primary)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
