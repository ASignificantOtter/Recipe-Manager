# Recipe Repository Best Practices

Agent-optimized best practices guide for Recipe Repository development.  
**Last updated**: 2026-02-13

## Quick Navigation

- **[1. Eliminating Waterfalls](#section-1)**
  - [Implement React Suspense for Streaming](#async-suspense-boundaries)
  - [Parallelize Promise Operations](#async-parallel-promises)
- **[2. Bundle Size Optimization](#section-2)**
  - [Use Dynamic Imports for Large Components](#bundle-dynamic-imports)
- **[3. Server-Side Performance](#section-3)**
  - [Use React.cache for Query Deduplication](#server-query-deduplication)
- **[4. Client-Side Data Fetching](#section-4)**
  - [Use SWR for Client-Side Data Fetching](#client-swr-deduplication)
- **[5. Re-render Optimization](#section-5)**
  - [Memoize Event Handlers with useCallback](#rerender-callback-memoization)
  - [Memoize List Item Components with React.memo](#rerender-component-memoization)

---

## 1. Eliminating Waterfalls {#section-1}

### Implement React Suspense for Streaming {#async-suspense-boundaries}

**Impact**: `CRITICAL`

Enables progressive rendering and better perceived performance through streaming

**Tags**: suspense, streaming, waterfall, server-components, progressive-rendering


## Implement React Suspense for Streaming

Use React Suspense boundaries to enable streaming responses instead of waiting for all data to load before rendering. This provides better perceived performance and allows users to see content progressively.

### Incorrect (Wait for all data)

```typescript
// ❌ BAD: Wait for everything, then render
async function RecipesPage() {
  const recipes = await db.recipe.findMany();
  const mealPlans = await db.mealPlan.findMany();
  
  return (
    <div>
      <RecipesList recipes={recipes} />
      <MealPlansSidebar mealPlans={mealPlans} />
    </div>
  );
}
```

User sees nothing until both queries complete.

### Correct (Progressive rendering with Suspense)

```typescript
// ✅ GOOD: Use Suspense for independent sections
async function RecipesPage() {
  return (
    <div>
      <Suspense fallback={<RecipesListSkeleton />}>
        <RecipesList />
      </Suspense>
      
      <Suspense fallback={<MealPlansSidebar />}>
        <MealPlansSidebar />
      </Suspense>
    </div>
  );
}

async function RecipesList() {
  const recipes = await db.recipe.findMany();
  return <ul>{recipes.map(r => <li key={r.id}>{r.name}</li>)}</ul>;
}

async function MealPlansSidebar() {
  const mealPlans = await db.mealPlan.findMany();
  return <aside>{/* ... */}</aside>;
}
```

User sees skeleton immediately, content streams in as it's ready.

### Client Component with Suspense

```typescript
// ✅ GOOD: Client components with Suspense
export default function RecipesPage() {
  return (
    <Suspense fallback={<div>Loading recipes...</div>}>
      <RecipesContent />
    </Suspense>
  );
}

async function RecipesContent() {
  const recipes = await fetch("/api/recipes").then(r => r.json());
  return <RecipesList recipes={recipes} />;
}
```

### Skeleton Component Pattern

```typescript
// ✅ GOOD: Realistic skeleton loaders
export function RecipesListSkeleton() {
  return (
    <ul className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
      ))}
    </ul>
  );
}
```

### Files Affected
- `src/app/recipes/page.tsx`
- `src/app/meal-plans/page.tsx`
- `src/app/meal-plans/[id]/page.tsx`

### Related Patterns
- Streaming SSR
- Server Components
- Error boundaries

### Key Points
1. Identify independent data fetching sections
2. Wrap each in a separate Suspense boundary
3. Create skeleton/fallback components that match layout
4. Keep suspense boundaries close to data fetches
5. Combine with Error Boundary for error handling

### Reference
[React Suspense Documentation](https://react.dev/reference/react/Suspense)

---

### Parallelize Promise Operations {#async-parallel-promises}

**Impact**: `CRITICAL`

Eliminates sequential processing bottlenecks by allowing independent operations to execute concurrently

**Tags**: promises, async, performance, waterfalls


## Parallelize Promise Operations

When you have multiple independent asynchronous operations, execute them in parallel using `Promise.all()` instead of awaiting them sequentially. This dramatically reduces total execution time.

### Incorrect (Sequential awaits)

```typescript
// ❌ BAD: Sequential awaits waste time
const recipeRes = await fetch("/api/recipes/123");
const recipe = await recipeRes.json();
const ingredientsRes = await fetch("/api/ingredients");
const ingredients = await ingredientsRes.json();
return { recipe, ingredients };
```

Total time: Sum of all request times (potentially 200ms + 200ms = 400ms)

### Correct (Parallel execution)

```typescript
// ✅ GOOD: Start promises early, await late
const [recipeRes, ingredientsRes] = await Promise.all([
  fetch("/api/recipes/123"),
  fetch("/api/ingredients"),
]);
const [recipe, ingredients] = await Promise.all([
  recipeRes.json(),
  ingredientsRes.json(),
]);
return { recipe, ingredients };
```

Total time: Maximum of request times (≈ 200ms, twice as fast)

### Database Operations Example

```typescript
// ❌ BAD: Sequential updates in a loop
for (const ingredient of ingredients) {
  await db.recipeIngredient.update({
    where: { id: ingredient.id },
    data: { quantity: ingredient.quantity },
  });
}

// ✅ GOOD: Parallel batch operations
await Promise.all(
  ingredients.map(ingredient =>
    db.recipeIngredient.update({
      where: { id: ingredient.id },
      data: { quantity: ingredient.quantity },
    })
  )
);
```

### Files Affected
- `src/app/api/recipes/[id]/route.ts`
- `src/app/api/meal-plans/route.ts`
- `src/app/recipes/[id]/page.tsx`

### Related Patterns
- Suspense boundaries for streaming
- React.cache() for deduplication
- Batch database operations

### Key Points
1. Identify independent operations in your code
2. Collect promises in an array before awaiting
3. Use `Promise.all()` to wait for all concurrently
4. Use `Promise.allSettled()` if you need all results even if some fail
5. Measure the impact with performance profiling

### Reference
[MDN: Promise.all()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)

---

## 2. Bundle Size Optimization {#section-2}

### Use Dynamic Imports for Large Components {#bundle-dynamic-imports}

**Impact**: `CRITICAL`

Dramatically reduces initial bundle size by code-splitting heavy components

**Tags**: bundle-size, code-splitting, dynamic-import, lazy-loading


## Use Dynamic Imports for Large Components

Use Next.js dynamic imports to split heavy components into separate chunks. This reduces your initial bundle size and speeds up initial page loads.

### Incorrect (Static imports increase bundle)

```typescript
// ❌ BAD: All components loaded upfront
import Navigation from "@/components/Navigation";
import RecipeUploader from "@/components/RecipeUploader";
import MealPlanGenerator from "@/components/MealPlanGenerator";

export default function Layout({ children }) {
  return (
    <>
      <Navigation />
      {children}
    </>
  );
}
```

All components are in the main bundle even if not used.

### Correct (Dynamic imports for non-critical code)

```typescript
// ✅ GOOD: Dynamic imports for heavy components
import dynamic from "next/dynamic";

// Components used immediately should still be static
import Navigation from "@/components/Navigation";

// Heavy components loaded on demand
const RecipeUploader = dynamic(() => import("@/components/RecipeUploader"), {
  loading: () => <div>Loading uploader...</div>,
  ssr: true,
});

const MealPlanGenerator = dynamic(
  () => import("@/components/MealPlanGenerator"),
  { ssr: true }
);

export default function Layout({ children }) {
  return (
    <>
      <Navigation />
      {children}
    </>
  );
}
```

### Route-Specific Heavy Libraries

```typescript
// ❌ BAD: Large parsing libraries in main bundle
import { parseIngredient } from "@/lib/uploader/ingredientParser";
import * as Tesseract from "tesseract.js";
import { parse as parsePDF } from "pdf-parse";

async function handleUpload(file) {
  const text = await extractText(file);
  return parseIngredient(text);
}

// ✅ GOOD: Lazy load heavy dependencies
async function handleUpload(file) {
  const { parseIngredient } = await import("@/lib/uploader/ingredientParser");
  const text = await extractText(file);
  return parseIngredient(text);
}

async function extractText(file) {
  if (file.type === "application/pdf") {
    const pdfParse = await import("pdf-parse");
    return pdfParse(file);
  } else if (file.type.startsWith("image/")) {
    const Tesseract = await import("tesseract.js");
    const result = await Tesseract.recognize(file);
    return result.data.text;
  }
}
```

### Third-Party Library Dynamic Import

```typescript
// ✅ GOOD: Defer heavy third-party libraries
"use client";

import { Button } from "@/components/Button";

export function AnalyticsButton() {
  const handleClick = async () => {
    // Only import analytics when needed
    const { trackEvent } = await import("@/lib/analytics");
    trackEvent("button-clicked");
  };

  return <Button onClick={handleClick}>Track Event</Button>;
}
```

### Files Affected
- `src/app/layout.tsx` (Navigation, heavy components)
- `src/app/recipes/upload/page.tsx` (OCR and parsing libraries)
- `src/app/meal-plans/new/page.tsx` (Heavy form components)

### Related Patterns
- Bundle size monitoring
- Code splitting strategy
- Lazy loading with Suspense

### Key Points
1. Identify components that are rarely used or appear below the fold
2. Identify heavy third-party libraries (tesseract.js, pdf-parse, mammoth)
3. Use dynamic imports with appropriate loading states
4. Keep critical components static
5. Monitor bundle size with `@next/bundle-analyzer`

### Measurement
Check bundle sizes with:
```bash
next build --profile
npm run analyze
```

### Reference
[Next.js Dynamic Import](https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading)

---

## 3. Server-Side Performance {#section-3}

### Use React.cache for Query Deduplication {#server-query-deduplication}

**Impact**: `HIGH`

Eliminates duplicate database queries within a single request using React's per-request cache

**Tags**: server-performance, caching, query-deduplication, database, react-cache


## Use React.cache for Query Deduplication

Wrap frequently called database queries with `React.cache()` to automatically deduplicate queries within a single request lifecycle. This prevents the same query from running multiple times during server-side rendering.

### Incorrect (Duplicate queries)

```typescript
// ❌ BAD: Recipe fetched multiple times per request
async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Query 1: Fetch recipe
  const recipe = await db.recipe.findUnique({
    where: { id },
    include: { ingredients: true },
  });

  // Other component also needs recipe
  return (
    <>
      <RecipeHeader recipe={recipe} />
      <RecipeContent recipe={recipe} />
      <RelatedRecipes currentId={id} />
    </>
  );
}

// ❌ BAD: Query runs again in separate component
async function RelatedRecipes({ currentId }: { currentId: string }) {
  const current = await db.recipe.findUnique({
    where: { id: currentId },
    include: { ingredients: true },
  });
  
  // Use current...
}
```

The recipe is fetched twice within the same request.

### Correct (Cached queries)

```typescript
// ✅ GOOD: Cache queries per request
import { cache } from "react";

// Cache the recipe query per request
const getRecipe = cache(async (id: string) => {
  console.log(`Fetching recipe ${id}`); // Logs only once per request
  return db.recipe.findUnique({
    where: { id },
    include: { ingredients: true },
  });
});

async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Query 1: Fetch recipe
  const recipe = await getRecipe(id);

  return (
    <>
      <RecipeHeader recipe={recipe} />
      <RecipeContent recipe={recipe} />
      <RelatedRecipes currentId={id} />
    </>
  );
}

// Query uses cache - no new fetch!
async function RelatedRecipes({ currentId }: { currentId: string }) {
  const current = await getRecipe(currentId); // Uses cached result
  // Use current...
}
```

### Caching Multiple Queries

```typescript
// ✅ GOOD: Cache multiple frequently used queries
import { cache } from "react";
import { db } from "@/lib/prisma";

export const getRecipe = cache(async (id: string) => {
  return db.recipe.findUnique({
    where: { id },
    include: { ingredients: true },
  });
});

export const getRecipes = cache(async (userId: string) => {
  return db.recipe.findMany({
    where: { userId },
    include: { ingredients: true },
  });
});

export const getMealPlan = cache(async (id: string) => {
  return db.mealPlan.findUnique({
    where: { id },
    include: {
      days: {
        include: { recipes: { include: { recipe: true } } },
      },
    },
  });
});

export const getCurrentUser = cache(async (userId: string) => {
  return db.user.findUnique({
    where: { id: userId },
    include: { mealPlans: true },
  });
});
```

### Using Cached Queries in Components

```typescript
// ✅ GOOD: Use cached queries in API routes and server components
import { getRecipe, getRecipes, getCurrentUser } from "@/lib/queries";

// API Route
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // All three queries run once per request, even if called multiple times
  const recipe = await getRecipe(id);
  const user = await getCurrentUser(recipe.userId);
  const otherRecipes = await getRecipes(user.id);

  return Response.json({
    recipe,
    related: otherRecipes.filter(r => r.id !== id).slice(0, 3),
  });
}

// Server Component
async function RecipeDetails({ recipeId }: { recipeId: string }) {
  const recipe = await getRecipe(recipeId);
  const author = await getCurrentUser(recipe.userId);

  return (
    <div>
      <h1>{recipe.name}</h1>
      <p>by {author.name}</p>
    </div>
  );
}
```

### Important: Cache Scope

```typescript
// ✅ IMPORTANT: Cache only lasts for the request duration
// Each request gets a fresh cache

// Request 1: getRecipe called twice -> executes once
// Request 2: getRecipe called once -> executes once (fresh cache)
// Request 3: getRecipe called three times -> executes once

// Cache is NOT shared across requests
// This is safe and intentional
```

### Files Affected
- `src/app/api/recipes/[id]/route.ts`
- `src/app/api/meal-plans/[id]/route.ts`
- `src/app/recipes/[id]/page.tsx`
- `src/app/meal-plans/[id]/page.tsx`

### Related Patterns
- Promise.all() for parallel queries
- Suspense boundaries
- LRU cache for cross-request caching

### Key Points
1. `React.cache()` deduplicates queries **within a single request**
2. Cache is cleared between requests (safe by design)
3. Safe in API routes and Server Components
4. Cannot be used with client components
5. Perfect for preventing duplicate queries in complex component trees

### Common Use Cases
- User data (loaded by auth middleware, used by multiple components)
- Recipe data (fetched for display, used in related-recipe logic)
- Meal plan data (parent and child components need access)

### Performance Impact
- Measured in milliseconds for repeated queries
- Larger impact with database round-trip time
- Most beneficial for blocking queries on critical path

### Reference
[React cache() Documentation](https://react.dev/reference/react/cache)

---

## 4. Client-Side Data Fetching {#section-4}

### Use SWR for Client-Side Data Fetching {#client-swr-deduplication}

**Impact**: `MEDIUM-HIGH`

Provides automatic deduplication, caching, and real-time updates for client-side data

**Tags**: data-fetching, caching, swr, client-side, performance


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

---

## 5. Re-render Optimization {#section-5}

### Memoize Event Handlers with useCallback {#rerender-callback-memoization}

**Impact**: `MEDIUM`

Prevents unnecessary child component re-renders caused by handler function recreation

**Tags**: re-render, optimization, useCallback, event-handlers, dependencies


## Memoize Event Handlers with useCallback

Event handlers created inside components are recreated on every render, causing memoized child components to unnecessarily re-render. Use `useCallback` to stabilize function references.

### Incorrect (Function recreated every render)

```typescript
// ❌ BAD: Functions recreated on every render
"use client";

import { useState } from "react";
import { RecipeCard } from "@/components/RecipeCard";

export function RecipesList() {
  const [recipes, setRecipes] = useState([]);

  // This function is recreated on every render
  const handleDeleteRecipe = async (id: string) => {
    await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    setRecipes(recipes.filter(r => r.id !== id));
  };

  // Even though RecipeCard is memoized, it re-renders
  // because handleDeleteRecipe changed
  return (
    <ul>
      {recipes.map(recipe => (
        <RecipeCard 
          key={recipe.id}
          recipe={recipe}
          onDelete={handleDeleteRecipe} // New function every render
        />
      ))}
    </ul>
  );
}
```

### Correct (Memoized function)

```typescript
// ✅ GOOD: Memoized function with useCallback
"use client";

import { useState, useCallback } from "react";
import { RecipeCard } from "@/components/RecipeCard";

export function RecipesList() {
  const [recipes, setRecipes] = useState([]);

  // Function reference stays same across renders
  const handleDeleteRecipe = useCallback(
    async (id: string) => {
      await fetch(`/api/recipes/${id}`, { method: "DELETE" });
      setRecipes(recipes.filter(r => r.id !== id));
    },
    [recipes] // Only recreate if recipes changes
  );

  return (
    <ul>
      {recipes.map(recipe => (
        <RecipeCard 
          key={recipe.id}
          recipe={recipe}
          onDelete={handleDeleteRecipe} // Same function reference
        />
      ))}
    </ul>
  );
}
```

### useCallback with Dependencies

```typescript
// ✅ GOOD: Correct dependency array
import { useCallback, useState } from "react";

export function RecipeForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Include all external values in dependencies
  const handleSave = useCallback(async () => {
    await fetch("/api/recipes", {
      method: "POST",
      body: JSON.stringify({ title, description }),
    });
  }, [title, description]); // Both dependencies needed

  return (
    <form>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <button onClick={handleSave}>Save</button>
    </form>
  );
}
```

### useCallback with useRef for Non-Dependencies

```typescript
// ✅ GOOD: Use useRef to avoid unnecessary recreations
import { useCallback, useRef } from "react";

export function IngredientInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  // Doesn't recreate when inputRef changes (refs don't cause recreates)
  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []); // No dependencies needed

  return (
    <>
      <input ref={inputRef} />
      <button onClick={focusInput}>Focus</button>
    </>
  );
}
```

### useCallback with Stable Handlers

```typescript
// ✅ GOOD: Pattern for complex handlers
import { useCallback } from "react";

export function RecipeEditor({ recipe, onSave }) {
  // Separate handler that doesn't need dependencies
  const handleValidation = useCallback((formData) => {
    return formData.title.length > 0 && formData.ingredients.length > 0;
  }, []);

  // Complex handler with minimal dependencies
  const handleSubmit = useCallback(async (formData) => {
    if (!handleValidation(formData)) return;
    await onSave(formData);
  }, [onSave, handleValidation]);

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
    </form>
  );
}
```

### Files Affected
- `src/app/recipes/page.tsx` - handleDeleteRecipe
- `src/app/recipes/new/page.tsx` - form handlers
- `src/app/meal-plans/page.tsx` - event handlers
- `src/app/meal-plans/[id]/page.tsx` - list handlers

### Related Patterns
- React.memo() for component memoization
- useMemo() for expensive calculations
- Dependency array management

### When to Use useCallback
- ✅ Functions passed as props to memoized components
- ✅ Functions used in dependency arrays of useEffect/useMemo
- ✅ Expensive event handlers
- ❌ Simple onClick handlers without memo children
- ❌ Functions only used in current component

### Common Mistakes
1. **Missing dependencies** - Leads to stale closures
2. **Over-memoizing** - Using useCallback for every function (minor overhead)
3. **Changing dependencies unnecessarily** - Defeats the purpose

### Performance Impact
- Minimal overhead for defining callbacks
- Significant benefit when children are memoized
- Profile with React DevTools to verify

### Reference
[useCallback Hook Documentation](https://react.dev/reference/react/useCallback)

---

### Memoize List Item Components with React.memo {#rerender-component-memoization}

**Impact**: `MEDIUM`

Prevents list items from re-rendering when sibling items change

**Tags**: re-render, optimization, React.memo, list-items, composition


## Memoize List Item Components with React.memo

List items re-render when parent data changes, even if the individual item's props didn't change. Wrap list components in `React.memo()` to prevent unnecessary re-renders.

### Incorrect (All list items re-render)

```typescript
// ❌ BAD: All RecipeCards re-render when any recipe changes
"use client";

import { useState } from "react";

export function RecipesList({ recipes }: { recipes: Recipe[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <ul>
      {recipes.map(recipe => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </ul>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <li>
      <h3>{recipe.name}</h3>
      <p>{recipe.description}</p>
      {/* Expensive render calculation */}
      <div>{recipe.ingredients.length} ingredients</div>
    </li>
  );
}
```

When recipes array updates or re-renders occur, ALL RecipeCard components re-render even if their specific recipe didn't change.

### Correct (Only changed items re-render)

```typescript
// ✅ GOOD: Memoized list items only re-render when their props change
"use client";

import { memo, useState } from "react";

export function RecipesList({ recipes }: { recipes: Recipe[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <ul>
      {recipes.map(recipe => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </ul>
  );
}

const RecipeCard = memo(function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <li>
      <h3>{recipe.name}</h3>
      <p>{recipe.description}</p>
      <div>{recipe.ingredients.length} ingredients</div>
    </li>
  );
});
```

### Memoized Component with Handlers

```typescript
// ✅ GOOD: Memoized component with stable callback
import { memo, useCallback } from "react";

export function RecipesList({ recipes }: { recipes: Recipe[] }) {
  const handleDelete = useCallback(
    async (id: string) => {
      await fetch(`/api/recipes/${id}`, { method: "DELETE" });
      // Update recipes
    },
    []
  );

  return (
    <ul>
      {recipes.map(recipe => (
        <RecipeCard 
          key={recipe.id}
          recipe={recipe}
          onDelete={handleDelete} // Stable callback
        />
      ))}
    </ul>
  );
}

interface RecipeCardProps {
  recipe: Recipe;
  onDelete: (id: string) => void;
}

const RecipeCard = memo(function RecipeCard({ 
  recipe, 
  onDelete 
}: RecipeCardProps) {
  return (
    <li>
      <h3>{recipe.name}</h3>
      <button onClick={() => onDelete(recipe.id)}>Delete</button>
    </li>
  );
});
```

### Custom Comparison with memo

```typescript
// ✅ GOOD: Custom comparison when default memo isn't enough
import { memo } from "react";

interface MealPlanDayProps {
  day: MealPlanDay;
  highlight?: boolean;
}

const MealPlanDay = memo(
  function MealPlanDay({ day, highlight }: MealPlanDayProps) {
    return (
      <div className={highlight ? "bg-yellow-100" : ""}>
        <h3>{day.date}</h3>
        {/* Complex rendering */}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Return true if props are equal (don't re-render)
    return (
      prevProps.day.id === nextProps.day.id &&
      prevProps.highlight === nextProps.highlight
    );
  }
);
```

### Measuring Impact

```typescript
// ✅ GOOD: Use React DevTools Profiler
// 1. Open React DevTools Profiler tab
// 2. Record interactions
// 3. Look for unnecessary re-renders
// 4. Apply React.memo to identified components

// Example verbose logging during development
const RecipeCard = memo(function RecipeCard({ recipe }: { recipe: Recipe }) {
  console.log(`RecipeCard ${recipe.id} rendered`);
  return <li>{recipe.name}</li>;
});
```

### Files Affected
- `src/app/recipes/page.tsx` - RecipeCard component
- `src/app/meal-plans/page.tsx` - MealPlanCard component
- `src/app/meal-plans/[id]/page.tsx` - DayCard, RecipeItem components
- `src/components/` - Any frequently rendered list components

### Related Patterns
- useCallback() for stable handlers
- useMemo() for expensive calculations
- Key prop management in lists

### When to Use React.memo
- ✅ List item components rendered in maps
- ✅ Components with expensive render logic
- ✅ Components that receive props from parent
- ❌ Simple components with minimal render cost
- ❌ Components with frequently changing props

### Common Mistakes
1. **Passing inline functions** - Props change every render, memo is wasted
2. **Creating new objects in props** - Objects are always different by reference
3. **Not using correct keys** - Keys should be stable identifiers
4. **Over-memoizing simple components** - Addition overhead can exceed benefit

### Performance Considerations
- React.memo adds a shallow comparison overhead
- Only beneficial for components that re-render frequently
- Profile actual rendering to verify improvement
- Use React DevTools Profiler to measure

### Reference
[React.memo Documentation](https://react.dev/reference/react/memo)

---

## Resources & References

- [React Best Practices - React Docs](https://react.dev/learn)
- [Next.js Performance Documentation](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web.dev Performance Guide](https://web.dev/performance/)
- [MDN Web Performance](https://developer.mozilla.org/en-US/docs/Web/Performance)
- [Vercel React Best Practices](https://github.com/vercel-labs/agent-skills)

---

Generated by Recipe Repository Best Practices Build System
