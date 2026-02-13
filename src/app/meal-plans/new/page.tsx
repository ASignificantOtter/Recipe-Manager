"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewMealPlanPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
  });

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Validate
      if (!formData.name || !formData.startDate || !formData.endDate) {
        setError("Name, start date, and end date are required");
        setIsLoading(false);
        return;
      }

      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);

      if (startDate >= endDate) {
        setError("End date must be after start date");
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/meal-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create meal plan");
      }

      const mealPlan = await response.json();
      router.push(`/meal-plans/${mealPlan.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create meal plan");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <nav className="border-b-2 border-[var(--border)] bg-white shadow-sm dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/meal-plans" className="text-[var(--primary)] font-semibold hover:text-[var(--primary-dark)] transition-colors">
                ← Back to Meal Plans
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-2xl py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-8 text-[var(--foreground)]">📅 Create New Meal Plan</h1>

        {error && (
          <div className="mb-6 rounded-lg border-l-4 border-[var(--error)] bg-red-50 dark:bg-red-950 p-4">
            <p className="text-sm font-semibold text-[var(--error)]">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 border-[var(--border)] p-8 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-[var(--foreground)]">
              Meal Plan Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              required
              placeholder="e.g., Weekly Meal Plan"
              className="mt-1 block w-full rounded-lg border-2 border-[var(--border)] px-4 py-3 text-[var(--foreground)] placeholder-[var(--foreground)] opacity-60 shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition dark:bg-slate-700"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--foreground)]">
              Description (optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              rows={3}
              placeholder="e.g., This week's healthy meal plan"
              className="mt-1 block w-full rounded-lg border-2 border-[var(--border)] px-4 py-3 text-[var(--foreground)] placeholder-[var(--foreground)] opacity-60 shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition dark:bg-slate-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)]">
                Start Date *
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleFormChange}
                required
                className="mt-1 block w-full rounded-lg border-2 border-[var(--border)] px-4 py-3 text-[var(--foreground)] shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition dark:bg-slate-700"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)]">
                End Date *
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleFormChange}
                required
                className="mt-1 block w-full rounded-lg border-2 border-[var(--border)] px-4 py-3 text-[var(--foreground)] shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition dark:bg-slate-700"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] active:scale-95 disabled:opacity-50 transition-all"
            >
              {isLoading ? "Creating..." : "✓ Create Meal Plan"}
            </button>
            <Link
              href="/meal-plans"
              className="flex-1 rounded-lg border-2 border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--primary)]/5 text-center transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
