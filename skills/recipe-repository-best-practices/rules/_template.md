---
title: Rule Title Here
impact: MEDIUM
impactDescription: Optional description of the specific impact
tags: tag1, tag2, tag3
---

## Rule Title Here

Brief explanation of the rule and why it matters. This should be 2-3 sentences that explain the problem and its impact on the application.

### Incorrect (description of what's wrong)

```typescript
// ❌ BAD: Description of the anti-pattern
const result = await fetch("/api/data");
```

### Correct (description of what's right)

```typescript
// ✅ GOOD: Description of the recommended approach
const result = await fetch("/api/data", { cache: "force-cache" });
```

Optional explanatory text after examples. This can include:
- Why the correct approach is better
- When to apply this pattern
- Related patterns or dependencies
- Trade-offs to consider

### Files Affected
- `src/app/api/recipes/route.ts`
- `src/app/recipes/page.tsx`

### Related Rules
- [Insert related rule title](./related-rule.md)

### Reference
[Link to external documentation](https://example.com/)
