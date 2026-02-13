---
title: Use Dynamic Imports for Large Components
impact: CRITICAL
impactDescription: Dramatically reduces initial bundle size by code-splitting heavy components
tags: bundle-size, code-splitting, dynamic-import, lazy-loading
---

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
