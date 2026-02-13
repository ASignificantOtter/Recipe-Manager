"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Ingredient {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  notes: string;
}

export default function EditRecipePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: "", quantity: 0, unit: "", notes: "" },
  ]);

  const [formData, setFormData] = useState({
    name: "",
    instructions: "",
    prepTime: "",
    cookTime: "",
    servings: "",
    notes: "",
    dietaryTags: [] as string[],
  });

  const dietaryOptions = ["vegetarian", "vegan", "gluten-free", "dairy-free", "nut-free"];

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
      setFormData({
        name: data.name,
        instructions: data.instructions,
        prepTime: data.prepTime?.toString() || "",
        cookTime: data.cookTime?.toString() || "",
        servings: data.servings?.toString() || "",
        notes: data.notes || "",
        dietaryTags: data.dietaryTags || [],
      });
      setIngredients(
        data.ingredients.map((ing: any) => ({
          id: ing.id,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes || "",
        }))
      );
    } catch (err) {
      setError("Failed to load recipe");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "prepTime" || name === "cookTime" || name === "servings" ? parseInt(value) || "" : value,
    }));
  };

  const handleDietaryTagChange = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      dietaryTags: prev.dietaryTags.includes(tag)
        ? prev.dietaryTags.filter((t) => t !== tag)
        : [...prev.dietaryTags, tag],
    }));
  };

  const handleIngredientChange = (
    index: number,
    field: keyof Ingredient,
    value: string | number
  ) => {
    const newIngredients = [...ingredients];
    if (field === "quantity") {
      newIngredients[index][field] = parseFloat(value as string) || 0;
    } else {
      newIngredients[index][field] = value as string;
    }
    setIngredients(newIngredients);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { name: "", quantity: 0, unit: "", notes: "" }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      if (!formData.name || !formData.instructions) {
        setError("Name and instructions are required");
        setIsSaving(false);
        return;
      }

      const validIngredients = ingredients.filter((ing) => ing.name.trim());

      const response = await fetch(`/api/recipes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          prepTime: formData.prepTime ? parseInt(formData.prepTime as any) : null,
          cookTime: formData.cookTime ? parseInt(formData.cookTime as any) : null,
          servings: formData.servings ? parseInt(formData.servings as any) : null,
          ingredients: validIngredients,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update recipe");
      }

      router.push(`/recipes/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update recipe");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <p className="text-[var(--foreground)] opacity-60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <nav className="border-b-2 border-[var(--border)] bg-white shadow-sm dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href={`/recipes/${id}`} className="text-[var(--primary)] font-semibold hover:text-[var(--primary-dark)] transition-colors">
                ← Back to Recipe
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-8 text-[var(--foreground)]">Edit Recipe</h1>

        {error && (
          <div className="mb-6 rounded-lg border-l-4 border-[var(--error)] bg-red-50 dark:bg-red-950 p-4">
            <p className="text-sm font-semibold text-[var(--error)]">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 border-[var(--border)] p-6">
            <h2 className="text-lg font-semibold mb-6 text-[var(--foreground)]">Basic Information</h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[var(--foreground)]">
                  Recipe Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  required
                  className="mt-2 block w-full rounded-lg border-2 border-[var(--border)] px-4 py-2 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)]">
                    Prep Time (min)
                  </label>
                  <input
                    type="number"
                    name="prepTime"
                    value={formData.prepTime}
                    onChange={handleFormChange}
                    min="0"
                    className="mt-2 block w-full rounded-lg border-2 border-[var(--border)] px-4 py-2 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)]">
                    Cook Time (min)
                  </label>
                  <input
                    type="number"
                    name="cookTime"
                    value={formData.cookTime}
                    onChange={handleFormChange}
                    min="0"
                    className="mt-2 block w-full rounded-lg border-2 border-[var(--border)] px-4 py-2 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)]">
                    Servings
                  </label>
                  <input
                    type="number"
                    name="servings"
                    value={formData.servings}
                    onChange={handleFormChange}
                    min="1"
                    className="mt-2 block w-full rounded-lg border-2 border-[var(--border)] px-4 py-2 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--foreground)] mb-3">
                  Dietary Tags
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {dietaryOptions.map((option) => (
                    <label key={option} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.dietaryTags.includes(option)}
                        onChange={() => handleDietaryTagChange(option)}
                        className="rounded border-2 border-[var(--border)] checked:bg-[var(--primary)] checked:border-[var(--primary)]"
                      />
                      <span className="ml-3 text-sm text-[var(--foreground)] capitalize font-medium">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 border-[var(--border)] p-6">
            <h2 className="text-lg font-semibold mb-6 text-[var(--foreground)]">Ingredients</h2>
            <div className="space-y-4">
              {ingredients.map((ingredient, index) => (
                <div key={index} className="flex gap-3 items-end bg-[var(--primary)]/5 p-4 rounded-lg">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-[var(--foreground)]">
                      Ingredient
                    </label>
                    <input
                      type="text"
                      value={ingredient.name}
                      onChange={(e) =>
                        handleIngredientChange(index, "name", e.target.value)
                      }
                      placeholder="e.g., pasta"
                      className="mt-2 block w-full rounded-lg border-2 border-[var(--border)] px-4 py-2 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                    />
                  </div>

                  <div className="w-24">
                    <label className="block text-sm font-semibold text-[var(--foreground)]">
                      Qty
                    </label>
                    <input
                      type="number"
                      value={ingredient.quantity || ""}
                      onChange={(e) =>
                        handleIngredientChange(index, "quantity", e.target.value)
                      }
                      step="0.1"
                      min="0"
                      className="mt-2 block w-full rounded-lg border-2 border-[var(--border)] px-4 py-2 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                    />
                  </div>

                  <div className="w-28">
                    <label className="block text-sm font-semibold text-[var(--foreground)]">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={ingredient.unit}
                      onChange={(e) =>
                        handleIngredientChange(index, "unit", e.target.value)
                      }
                      placeholder="cups"
                      className="mt-2 block w-full rounded-lg border-2 border-[var(--border)] px-4 py-2 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeIngredient(index)}
                    className="text-[var(--error)] hover:text-[var(--accent-dark)] text-sm font-semibold transition-colors px-3 py-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addIngredient}
                className="mt-4 text-[var(--primary)] hover:text-[var(--primary-dark)] text-sm font-semibold transition-colors py-2 px-4 border-2 border-dashed border-[var(--border)] rounded-lg hover:border-[var(--primary)]"
              >
                + Add Ingredient
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 border-[var(--border)] p-6">
            <h2 className="text-lg font-semibold mb-6 text-[var(--foreground)]">Instructions</h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[var(--foreground)]">
                  Instructions *
                </label>
                <textarea
                  name="instructions"
                  value={formData.instructions}
                  onChange={handleFormChange}
                  required
                  rows={8}
                  className="mt-2 block w-full rounded-lg border-2 border-[var(--border)] px-4 py-2 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--foreground)]">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  rows={4}
                  className="mt-2 block w-full rounded-lg border-2 border-[var(--border)] px-4 py-2 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
            <Link
              href={`/recipes/${id}`}
              className="flex-1 rounded-lg border-2 border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 text-center transition-all"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
