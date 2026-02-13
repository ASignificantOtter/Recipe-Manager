---
title: Memoize Event Handlers with useCallback
impact: MEDIUM
impactDescription: Prevents unnecessary child component re-renders caused by handler function recreation
tags: re-render, optimization, useCallback, event-handlers, dependencies
---

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
