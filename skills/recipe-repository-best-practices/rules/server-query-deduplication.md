---
title: Use React.cache for Query Deduplication
impact: HIGH
impactDescription: Eliminates duplicate database queries within a single request using React's per-request cache
tags: server-performance, caching, query-deduplication, database, react-cache
---

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
