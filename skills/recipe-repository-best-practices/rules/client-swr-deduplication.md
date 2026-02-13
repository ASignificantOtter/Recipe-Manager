---
title: Use SWR for Client-Side Data Fetching
impact: MEDIUM-HIGH
impactDescription: Provides automatic deduplication, caching, and real-time updates for client-side data
tags: data-fetching, caching, swr, client-side, performance
---

## Use SWR for Client-Side Data Fetching

Replace manual fetch calls with SWR to automatically handle deduplication, caching, error handling, and revalidation. SWR is already installed in your project.

### Incorrect (Manual fetch without caching)

```typescript
// ❌ BAD: Manual fetch, no deduplication
"use client";

import { useState, useEffect } from "react";

export function RecipesList() {
  const [recipes, setRecipes] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const res = await fetch("/api/recipes");
        const data = await res.json();
        setRecipes(data);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecipes();
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <ul>{recipes.map(r => <li key={r.id}>{r.name}</li>)}</ul>;
}
```

Problems: No deduplication, no caching, duplicate requests if component unmounts/remounts

### Correct (Using SWR)

```typescript
// ✅ GOOD: Use SWR for built-in optimizations
"use client";

import useSWR from "swr";

const fetcher = (url) => fetch(url).then((r) => r.json());

export function RecipesList() {
  const { data: recipes, error, isLoading } = useSWR("/api/recipes", fetcher);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <ul>{recipes?.map(r => <li key={r.id}>{r.name}</li>)}</ul>;
}
```

Automatic benefits:
- Request deduplication across components
- Built-in caching
- Automatic revalidation 
- Stale-while-revalidate pattern
- Easy error handling

### SWR with Global Fetcher Configuration

```typescript
// ✅ GOOD: Configure SWR once globally
// src/lib/swr.ts
import useSWR, { SWRConfig } from "swr";

export const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("API error");
    return res.json();
  });

// src/components/Providers.tsx
import { SWRConfig } from "swr";
import { fetcher } from "@/lib/swr";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 60000, // 1 minute
      }}
    >
      {children}
    </SWRConfig>
  );
}

// Usage in components is now simple
export function RecipesList() {
  const { data: recipes, error, isLoading } = useSWR("/api/recipes");
  // ... rest of component
}
```

### Mutating Data with SWR

```typescript
// ✅ GOOD: Use SWR for mutations too
"use client";

import { useState } from "react";
import useSWR from "swr";

export function RecipeCard({ recipeId }: { recipeId: string }) {
  const { data: recipe, mutate } = useSWR(`/api/recipes/${recipeId}`);

  const handleDelete = async () => {
    // Optimistic update
    mutate(null, false);

    try {
      await fetch(`/api/recipes/${recipeId}`, { method: "DELETE" });
      mutate(); // Revalidate after success
    } catch (error) {
      mutate(); // Revert on error
    }
  };

  return (
    <div>
      <h2>{recipe?.name}</h2>
      <button onClick={handleDelete}>Delete</button>
    </div>
  );
}
```

### Handling Multiple SWR Requests

```typescript
// ✅ GOOD: Use multiple SWR hooks for independent data
export function MealPlanView({ mealPlanId }: { mealPlanId: string }) {
  const { data: mealPlan } = useSWR(`/api/meal-plans/${mealPlanId}`);
  const { data: recipes } = useSWR("/api/recipes");
  const { data: shoppingList } = useSWR(
    mealPlanId ? `/api/meal-plans/${mealPlanId}/shopping-list` : null
  );

  // Requests deduplicate automatically
  // Conditional requests (when parent data loads) supported with null keys
}
```

### Files Affected
- `src/app/recipes/page.tsx`
- `src/app/meal-plans/page.tsx`
- `src/app/meal-plans/[id]/page.tsx`
- `src/components/Providers.tsx` (global config)

### Related Patterns
- React Query (alternative)
- Suspense with async data
- Optimistic updates

### Key Points
1. SWR is already installed - start using it immediately
2. Create a global `fetcher` function
3. Configure SWR once in Providers component
4. Replace useState + useEffect patterns with useSWR
5. Use `mutate()` for manual revalidation
6. Support conditional fetching with null keys

### Configuration Options
- `revalidateOnFocus` - Revalidate when window regains focus
- `revalidateOnReconnect` - Revalidate when network reconnects
- `dedupingInterval` - Deduplication window (default 2000ms)
- `focusThrottleInterval` - Focus throttle (default 5000ms)

### Reference
[SWR Documentation](https://swr.vercel.app/)
