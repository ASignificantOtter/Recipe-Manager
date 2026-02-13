---
title: Implement React Suspense for Streaming
impact: CRITICAL
impactDescription: Enables progressive rendering and better perceived performance through streaming
tags: suspense, streaming, waterfall, server-components, progressive-rendering
---

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
