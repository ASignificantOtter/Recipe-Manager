"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRecipe, useRecipeSharing } from "@/lib/hooks/useSWR";

interface Recipe {
  id: string;
  userId: string;
  name: string;
  instructions: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  notes?: string;
  dietaryTags: string[];
  isPublic?: boolean;
  ingredients: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
}

function RecipeSharePanel({ recipeId }: { recipeId: string }) {
  const { sharing, isLoading, mutate } = useRecipeSharing(recipeId);
  const [email, setEmail] = useState("");
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleTogglePublic = useCallback(async () => {
    if (!sharing) return;
    setShareError(null);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !sharing.isPublic }),
      });
      if (!res.ok) throw new Error("Failed to update visibility");
      mutate();
    } catch {
      setShareError("Failed to update visibility. Please try again.");
    }
  }, [recipeId, sharing, mutate]);

  const handleShareWithUser = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setShareError(null);
    setShareSuccess(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareWithEmail: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setShareError(data.error ?? "Failed to share recipe");
      } else {
        setShareSuccess(`Recipe shared with ${email.trim()}`);
        setEmail("");
        mutate();
      }
    } catch {
      setShareError("Failed to share recipe. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [recipeId, email, mutate]);

  const handleRemoveUser = useCallback(async (userId: string) => {
    setShareError(null);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/share`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeUserId: userId }),
      });
      if (!res.ok) throw new Error("Failed to remove share");
      mutate();
    } catch {
      setShareError("Failed to remove user. Please try again.");
    }
  }, [recipeId, mutate]);

  if (isLoading) {
    return <p className="text-sm text-[var(--foreground)] opacity-60">Loading sharing settings…</p>;
  }

  return (
    <div className="space-y-4">
      {/* Public toggle */}
      <div className="flex items-center justify-between rounded-lg border-2 border-[var(--border)] p-4">
        <div>
          <p className="font-semibold text-[var(--foreground)]">🌐 Make recipe public</p>
          <p className="text-xs text-[var(--foreground)] opacity-60 mt-0.5">
            Anyone on RecipeHub can discover and view this recipe
          </p>
        </div>
        <button
          type="button"
          onClick={handleTogglePublic}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            sharing?.isPublic ? "bg-[var(--primary)]" : "bg-gray-300 dark:bg-slate-600"
          }`}
          aria-label="Toggle public visibility"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              sharing?.isPublic ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Share with specific user */}
      <div className="rounded-lg border-2 border-[var(--border)] p-4 space-y-3">
        <p className="font-semibold text-[var(--foreground)]">🔗 Share with a specific user</p>
        <form onSubmit={handleShareWithUser} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter user's email address"
            className="flex-1 rounded-lg border-2 border-[var(--border)] bg-white px-3 py-1.5 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none dark:bg-slate-900"
          />
          <button
            type="submit"
            disabled={submitting || !email.trim()}
            className="rounded-lg bg-[var(--primary)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:opacity-50 transition-colors"
          >
            {submitting ? "Sharing…" : "Share"}
          </button>
        </form>

        {shareError && (
          <p className="text-xs font-semibold text-[var(--error)]">{shareError}</p>
        )}
        {shareSuccess && (
          <p className="text-xs font-semibold text-green-600 dark:text-green-400">{shareSuccess}</p>
        )}

        {/* Current shares */}
        {sharing?.sharedWith && sharing.sharedWith.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[var(--border)]">
            <p className="text-xs font-semibold text-[var(--foreground)] opacity-60">Shared with:</p>
            {sharing.sharedWith.map((u) => (
              <div key={u.id} className="flex items-center justify-between text-sm">
                <span className="text-[var(--foreground)]">{u.name ?? u.email}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveUser(u.id)}
                  className="text-xs text-[var(--error)] hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: session } = useSession();
  
  const { recipe, isLoading, isError } = useRecipe(id);
  const [showShare, setShowShare] = useState(false);

  const handleDelete = useCallback(async () => {
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
      console.error(err);
    }
  }, [id, router]);

  const error = isError ? "Failed to load recipe" : null;
  const isOwner = session?.user?.id && recipe?.userId === session.user.id;

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
              {isOwner && (
                <>
                  <button
                    onClick={() => setShowShare((v) => !v)}
                    className="text-[var(--primary)] font-semibold hover:text-[var(--primary-dark)] transition-colors"
                  >
                    {showShare ? "Hide Share" : "🔗 Share"}
                  </button>
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
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Share panel */}
        {isOwner && showShare && (
          <div className="rounded-xl border-2 border-[var(--primary)]/30 bg-white dark:bg-slate-800 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">🔗 Sharing Settings</h2>
            <RecipeSharePanel recipeId={id} />
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 border-[var(--border)] p-8">
          <div className="mb-8">
            <div className="flex items-start gap-3">
              <h1 className="text-4xl font-bold text-[var(--foreground)] flex-1">{recipe.name}</h1>
              {(recipe as Recipe).isPublic && (
                <span className="mt-2 shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
                  🌐 Public
                </span>
              )}
            </div>
            {recipe.dietaryTags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {recipe.dietaryTags.map((tag: string) => (
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
                {recipe.ingredients.map((ingredient: { id: string; name: string; quantity: number; unit: string; notes?: string }) => (
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
