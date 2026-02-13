---
title: Parallelize Promise Operations
impact: CRITICAL
impactDescription: Eliminates sequential processing bottlenecks by allowing independent operations to execute concurrently
tags: promises, async, performance, waterfalls
---

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
