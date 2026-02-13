"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";

interface ShoppingListItem {
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

interface ShoppingListData {
  mealPlanId: string;
  mealPlanName: string;
  shoppingList: ShoppingListItem[];
  totalItems: number;
}

export default function ShoppingListPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [shoppingList, setShoppingList] = useState<ShoppingListData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchShoppingList();
  }, [id]);

  const fetchShoppingList = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/meal-plans/${id}/shopping-list`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch shopping list");
      }

      const data = await response.json();
      setShoppingList(data);
    } catch (err) {
      setError("Failed to load shopping list");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItem = (itemName: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemName)) {
      newChecked.delete(itemName);
    } else {
      newChecked.add(itemName);
    }
    setCheckedItems(newChecked);
  };

  const handleExportAsText = () => {
    if (!shoppingList) return;

    let text = `Shopping List for: ${shoppingList.mealPlanName}\n`;
    text += `Total items: ${shoppingList.totalItems}\n\n`;
    
    shoppingList.shoppingList.forEach((item) => {
      const checked = checkedItems.has(item.name) ? "[✓]" : "[ ]";
      text += `${checked} ${item.quantity} ${item.unit} ${item.name}`;
      if (item.notes) {
        text += ` (${item.notes})`;
      }
      text += "\n";
    });

    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(text)
    );
    element.setAttribute("download", `shopping-list-${shoppingList.mealPlanId}.txt`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <p className="text-[var(--foreground)] opacity-60">Loading...</p>
      </div>
    );
  }

  if (error || !shoppingList) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <nav className="border-b-2 border-[var(--border)] bg-white shadow-sm dark:bg-slate-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="h-16 flex items-center">
              <Link href="/meal-plans" className="text-[var(--primary)] font-semibold hover:text-[var(--primary-dark)] transition-colors">
                ← Back to Meal Plans
              </Link>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-4xl py-8 px-4">
          <div className="rounded-lg border-l-4 border-[var(--error)] bg-red-50 dark:bg-red-950 p-4">
            <p className="text-sm font-semibold text-[var(--error)]">
              {error || "Shopping list not found"}
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <nav className="border-b-2 border-[var(--border)] bg-white shadow-sm dark:bg-slate-900">
        <div className="mx-auto max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href={`/meal-plans/${id}`} className="text-[var(--primary)] font-semibold hover:text-[var(--primary-dark)] transition-colors">
                ← Back to Meal Plan
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleExportAsText}
                className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] active:scale-95 transition-all"
              >
                📥 Export as Text
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[var(--foreground)]">🛒 Shopping List</h1>
          <p className="mt-2 text-[var(--foreground)] opacity-70 font-semibold">{shoppingList.mealPlanName}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 border-[var(--border)] p-8">
          <div className="mb-6 text-sm font-semibold text-[var(--foreground)] opacity-70">
            📋 Total items: {shoppingList.totalItems}
            {checkedItems.size > 0 && ` • ✓ ${checkedItems.size} checked`}
          </div>

          <div className="space-y-3">
            {shoppingList.shoppingList.map((item) => {
              const itemKey = item.name;
              const isChecked = checkedItems.has(itemKey);

              return (
                <label
                  key={itemKey}
                  className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition ${
                    isChecked
                      ? "bg-[var(--primary)]/10 border-[var(--primary)] opacity-60"
                      : "bg-white dark:bg-slate-700 border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleItem(itemKey)}
                    className="rounded border-2 border-[var(--border)] checked:bg-[var(--primary)] checked:border-[var(--primary)]"
                  />
                  <div className="ml-4 flex-1">
                    <span
                      className={`text-lg font-semibold ${
                        isChecked ? "line-through text-[var(--foreground)] opacity-50" : "text-[var(--foreground)]"
                      }`}
                    >
                      {item.quantity} {item.unit} {item.name}
                    </span>
                    {item.notes && (
                      <p className="text-sm text-[var(--foreground)] opacity-60 mt-1">{item.notes}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          {shoppingList.shoppingList.length === 0 && (
            <p className="text-center text-[var(--foreground)] opacity-60 py-12 font-medium">
              No ingredients in your meal plan yet.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
