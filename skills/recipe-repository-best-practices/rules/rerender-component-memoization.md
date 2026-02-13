---
title: Memoize List Item Components with React.memo
impact: MEDIUM
impactDescription: Prevents list items from re-rendering when sibling items change
tags: re-render, optimization, React.memo, list-items, composition
---

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
