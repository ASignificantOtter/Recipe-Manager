"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadParserUtils } from "@/lib/utils/lazyLoaders";

interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  notes: string;
}

export default function UploadRecipePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [parsingWarning, setParsingWarning] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<{
    name?: string;
    ingredients?: string[];
    instructions?: string;
  } | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: "", quantity: 0, unit: "", notes: "" },
  ]);
  const [originalIngredients, setOriginalIngredients] = useState<Ingredient[] | null>(null);
  const [perIngredientCanonical, setPerIngredientCanonical] = useState<Record<number, boolean>>({});

  const [formData, setFormData] = useState({
    name: "",
    instructions: "",
    prepTime: "",
    cookTime: "",
    servings: "",
    notes: "",
    dietaryTags: [] as string[],
  });

  const dietaryOptions = useMemo(
    () => ["vegetarian", "vegan", "gluten-free", "dairy-free", "nut-free"],
    []
  );

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    try {
      const response = await fetch("/api/recipes/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload file");
      }

      const data = await response.json();
      setUploadedFile(data.filename);
      setParsingWarning(data.parsingWarning ?? null);
      if (data.extractedRecipeData) {
        setExtractedData(data.extractedRecipeData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const importParsedIngredients = useCallback(async (lines: string[]) => {
    const { parseIngredient } = await loadParserUtils();
    const mapped = lines.map((line) => {
      const parsed = parseIngredient(line);
      return {
        name: parsed.name,
        quantity: parsed.quantity,
        unit: parsed.unit,
        notes: parsed.notes || "",
      } as Ingredient;
    });
    setOriginalIngredients(mapped.map((m) => ({ ...m })));
    setIngredients(mapped);
  }, []);

  // parse ingredient strings into structured fields
  const applyExtracted = useCallback(() => {
    if (!extractedData) return;
    setFormData((prev) => ({
      ...prev,
      name: extractedData.name || prev.name,
      instructions: extractedData.instructions || prev.instructions,
    }));

    if (extractedData.ingredients && extractedData.ingredients.length > 0) {
      // Map string ingredients to Ingredient objects (best-effort)
      importParsedIngredients(extractedData.ingredients);
    }

    setExtractedData(null);
  }, [extractedData, importParsedIngredients]);

  const normalizeIngredient = useCallback(async (index: number) => {
    const { normalizeParsedIngredient } = await loadParserUtils();
    const current = ingredients[index];
    const parsed = normalizeParsedIngredient({
      name: current.name,
      quantity: current.quantity,
      unit: current.unit,
      notes: current.notes,
    } as any);

    const updated = [...ingredients];
    // if canonicalQuantity exists and unit changed to metric base, show converted value
    if (parsed.canonicalQuantity && parsed.canonicalUnit) {
      // show canonical quantity but keep unit as canonicalUnit
      updated[index] = {
        ...updated[index],
        quantity: Math.round(parsed.canonicalQuantity * 100) / 100,
        unit: parsed.canonicalUnit,
      };
    } else if (parsed.canonicalUnit) {
      updated[index] = { ...updated[index], unit: parsed.canonicalUnit };
    }

    setIngredients(updated);
  }, [ingredients]);

  const normalizeAll = useCallback(async () => {
    const { normalizeParsedIngredient } = await loadParserUtils();
    const updated = ingredients.map((ing) => {
      const parsed = normalizeParsedIngredient(ing as any);
      if (parsed.canonicalQuantity && parsed.canonicalUnit) {
        return { ...ing, quantity: Math.round(parsed.canonicalQuantity * 100) / 100, unit: parsed.canonicalUnit } as Ingredient;
      }
      if (parsed.canonicalUnit) return { ...ing, unit: parsed.canonicalUnit } as Ingredient;
      return ing;
    });
    setOriginalIngredients(originalIngredients ?? ingredients.map((i) => ({ ...i })));
    setIngredients(updated);
  }, [ingredients, originalIngredients]);

  const revertNormalization = useCallback(() => {
    if (originalIngredients) {
      setIngredients(originalIngredients);
      setOriginalIngredients(null);
      setPerIngredientCanonical({});
    }
  }, [originalIngredients]);

  const toggleCanonicalForIngredient = useCallback((index: number) => {
    setPerIngredientCanonical((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  }, []);

  const dismissExtracted = useCallback(() => {
    setExtractedData(null);
    setParsingWarning(null);
  }, []);

  const handleFormChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "prepTime" || name === "cookTime" || name === "servings" ? parseInt(value) || "" : value,
    }));
  }, []);

  const handleDietaryTagChange = useCallback((tag: string) => {
    setFormData((prev) => ({
      ...prev,
      dietaryTags: prev.dietaryTags.includes(tag)
        ? prev.dietaryTags.filter((t) => t !== tag)
        : [...prev.dietaryTags, tag],
    }));
  }, []);

  const handleIngredientChange = useCallback((
    index: number,
    field: keyof Ingredient,
    value: string | number
  ) => {
    setIngredients((prev) => {
      const newIngredients = [...prev];
      if (field === "quantity") {
        newIngredients[index][field] = parseFloat(value as string) || 0;
      } else {
        newIngredients[index][field] = value as string;
      }
      return newIngredients;
    });
  }, []);

  const addIngredient = useCallback(() => {
    setIngredients((prev) => [...prev, { name: "", quantity: 0, unit: "", notes: "" }]);
  }, []);

  const removeIngredient = useCallback((index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Validate
      if (!formData.name || !formData.instructions) {
        setError("Name and instructions are required");
        setIsLoading(false);
        return;
      }

      const validIngredients = ingredients.filter((ing) => ing.name.trim());

      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          prepTime: formData.prepTime ? parseInt(formData.prepTime as any) : null,
          cookTime: formData.cookTime ? parseInt(formData.cookTime as any) : null,
          servings: formData.servings ? parseInt(formData.servings as any) : null,
          ingredients: validIngredients,
          uploadedFile,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create recipe");
      }

      router.push("/recipes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create recipe");
    } finally {
      setIsLoading(false);
    }
  }, [formData, ingredients, uploadedFile, router]);

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
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-8 text-[var(--foreground)]">Upload Recipe</h1>

        {error && (
          <div className="mb-6 rounded-lg border-l-4 border-[var(--error)] bg-red-50 dark:bg-red-950 p-4">
            <p className="text-sm font-semibold text-[var(--error)]">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 border-[var(--border)] p-6">
            <h2 className="text-lg font-semibold mb-6 text-[var(--foreground)]">Upload File</h2>
            
            <div className="border-2 border-dashed border-[var(--border)] rounded-lg p-8 text-center bg-[var(--primary)]/5 hover:border-[var(--primary)] transition-colors">
              <input
                type="file"
                accept=".pdf,.docx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                disabled={isLoading}
                className="block w-full"
              />
              <p className="mt-3 text-sm text-[var(--foreground)] opacity-60 font-medium">
                Supported formats: PDF, Word, JPEG, PNG (max 10MB)
              </p>
              {uploadedFile && (
                <p className="mt-3 text-sm text-[var(--success)] font-semibold">✓ File uploaded: {uploadedFile}</p>
              )}
              {parsingWarning && (
                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400 font-medium" role="status">
                  {parsingWarning}
                </p>
              )}
            </div>

            {/* Extracted preview */}
            {extractedData && (
              <>
                <div className="mt-6 rounded-lg border-2 border-[var(--border)] bg-white dark:bg-slate-800 p-4">
                  <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2">Extracted from file</h3>
                  <div className="text-sm text-[var(--foreground)] opacity-80">
                    <p className="font-medium">Title</p>
                    <p className="mb-2">{extractedData.name || <em>Not detected</em>}</p>

                    <p className="font-medium">Ingredients</p>
                    {extractedData.ingredients && extractedData.ingredients.length > 0 ? (
                      <ul className="list-disc list-inside mb-2">
                        {extractedData.ingredients.map((ing, i) => (
                          <li key={i}>{ing}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mb-2"><em>No ingredients detected</em></p>
                    )}

                    <p className="font-medium">Instructions (preview)</p>
                    <p className="whitespace-pre-wrap max-h-36 overflow-auto mb-2">{extractedData.instructions || <em>Not detected</em>}</p>
                  </div>

                  <div className="flex gap-3 mt-3">
                    <button
                      type="button"
                      onClick={applyExtracted}
                      className="rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] transition-all"
                    >
                      Apply Extracted
                    </button>
                    <button
                      type="button"
                      onClick={dismissExtracted}
                      className="rounded-lg border-2 border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--primary)] transition-all"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex gap-3 justify-center">
                  <button
                    type="button"
                    onClick={normalizeAll}
                    className="rounded-lg border-2 border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--primary)] transition-all"
                  >
                    Normalize All Units
                  </button>
                </div>
              </>
            )}
          </div>

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
                  placeholder="e.g., Classic Pasta Carbonara"
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
                    placeholder="30"
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
                    placeholder="20"
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
                    placeholder="4"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4">
                {originalIngredients && (
                  <button type="button" onClick={revertNormalization} className="text-sm text-[var(--primary)] hover:underline">Revert normalization</button>
                )}
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
              {ingredients.map((ingredient, index) => {
                const isShowingCanonical = perIngredientCanonical[index];
                const original = originalIngredients?.[index];
                return (
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
                        {isShowingCanonical ? "Canonical Qty" : "Qty"}
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
                        placeholder="1"
                      />
                    </div>

                    <div className="w-28">
                      <label className="block text-sm font-semibold text-[var(--foreground)]">
                        {isShowingCanonical ? "Canonical Unit" : "Unit"}
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

                    {original && (
                      <button
                        type="button"
                        onClick={() => toggleCanonicalForIngredient(index)}
                        className="ml-2 text-[var(--primary)] hover:text-[var(--primary-dark)] text-xs font-semibold transition-colors px-2 py-2 whitespace-nowrap"
                      >
                        {isShowingCanonical ? "← Original" : "Canonical →"}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className="text-[var(--error)] hover:text-[var(--accent-dark)] text-sm font-semibold transition-colors px-3 py-2"
                    >
                      ✕
                    </button>
                    <button
                      type="button"
                      onClick={() => normalizeIngredient(index)}
                      className="ml-2 text-[var(--primary)] hover:text-[var(--primary-dark)] text-sm font-semibold transition-colors px-3 py-2"
                    >
                      Normalize
                    </button>
                  </div>
                );
              })}
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
                  placeholder="Step-by-step instructions..."
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
                  placeholder="Optional notes or tips..."
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              {isLoading ? "Creating..." : "Create Recipe"}
            </button>
            <Link
              href="/recipes"
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
