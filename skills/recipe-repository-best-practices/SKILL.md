# Recipe Repository Best Practices Skills

This is a comprehensive, agent-optimized skill set for optimizing the Recipe Repository application based on React and Next.js best practices.

## Overview

The Recipe Repository Best Practices skill set provides structured, modular guidance on performance optimization, data fetching patterns, rendering efficiency, and advanced techniques. Each skill is designed to be:

- **Granular**: One specific optimization technique per rule
- **Actionable**: Includes code examples and files affected
- **Agent-friendly**: Structured format for LLM processing
- **Maintainable**: Easy to add, update, and organize rules

## Directory Structure

```
skills/recipe-repository-best-practices/
├── rules/                           # Individual rule files
│   ├── _sections.md                # Section metadata (do not modify)
│   ├── _template.md                # Template for new rules
│   ├── async-parallel-promises.md
│   ├── async-suspense-boundaries.md
│   ├── bundle-dynamic-imports.md
│   ├── client-swr-deduplication.md
│   ├── rerender-callback-memoization.md
│   ├── rerender-component-memoization.md
│   └── server-query-deduplication.md
├── src/                            # Build utilities
│   ├── build.ts                    # Compile rules to AGENTS.md
│   └── validate.ts                 # Validate rule files
├── metadata.json                   # Skill metadata
├── package.json                    # Dependencies and scripts
├── README.md                        # Getting started
├── SKILL.md                        # This file
├── AGENTS.md                       # Generated output (agent-readable format)
└── test-cases.json                 # Extracted test cases
```

## Getting Started

### Installation

1. Navigate to the skills directory:
```bash
cd skills/recipe-repository-best-practices
```

2. Install dependencies (optional, for building):
```bash
npm install
```

### Using the Skills

#### For AI Agents

Provide the `AGENTS.md` file to your AI agent:

```bash
cat AGENTS.md
```

Agent will have access to:
- All rules organized by section
- Impact levels for prioritization
- Code examples (bad vs good)
- Related patterns and references
- Files affected in the codebase

#### For Developers

1. Read the compiled guide:
```bash
cat AGENTS.md
```

2. Find relevant sections by impact:
   - 🔴 **CRITICAL**: Start here for max impact
   - 🟠 **HIGH**: Important optimizations
   - 🟡 **MEDIUM-HIGH**: Moderate improvements
   - 🟢 **MEDIUM**: Nice-to-have optimizations

3. Review "Files Affected" to locate relevant code
4. Follow code examples to apply the pattern

### Building the Skills

Run the build process to compile rules into AGENTS.md:

```bash
npm run build          # Build AGENTS.md and test-cases.json
npm run validate       # Validate all rules
npm run dev           # Validate + build (recommended before commit)
```

## Skill Categories

### 1. Eliminating Waterfalls (CRITICAL)

Prevent sequential operations when parallel execution is possible.

**Key Skills:**
- [Parallelize Promise Operations](rules/async-parallel-promises.md)
- [Implement React Suspense for Streaming](rules/async-suspense-boundaries.md)

**Impact**: 30-50% latency reduction for multi-operation sequences

### 2. Bundle Size Optimization (CRITICAL)

Reduce JavaScript bundle size through code splitting and lazy loading.

**Key Skills:**
- [Use Dynamic Imports for Large Components](rules/bundle-dynamic-imports.md)

**Impact**: 20-40% reduction in initial bundle size

### 3. Server-Side Performance (HIGH)

Optimize server-side rendering and query efficiency.

**Key Skills:**
- [Use React.cache for Query Deduplication](rules/server-query-deduplication.md)

**Impact**: Eliminates duplicate database queries with zero code overhead

### 4. Client-Side Data Fetching (MEDIUM-HIGH)

Implement caching and deduplication for client-side data.

**Key Skills:**
- [Use SWR for Client-Side Data Fetching](rules/client-swr-deduplication.md)

**Impact**: Automatic caching, deduplication, and real-time updates

### 5. Re-render Optimization (MEDIUM)

Prevent unnecessary React re-renders.

**Key Skills:**
- [Memoize Event Handlers with useCallback](rules/rerender-callback-memoization.md)
- [Memoize List Item Components with React.memo](rules/rerender-component-memoization.md)

**Impact**: Smoother interactions, especially in lists

### 6. Rendering Performance (MEDIUM)

Optimize React rendering lifecycle.

**Key Skills:**
(To be extended with additional rules)

### 7. JavaScript Performance (LOW-MEDIUM)

General JavaScript optimizations.

**Key Skills:**
(To be extended with additional rules)

### 8. Advanced Patterns (LOW)

Architect for specialized use cases.

**Key Skills:**
(To be extended with advanced patterns)

## Creating New Skills

### Step 1: Choose the Right Section

Select the appropriate section prefix:
- `async-` for Eliminating Waterfalls
- `bundle-` for Bundle Size Optimization
- `server-` for Server-Side Performance
- `client-` for Client-Side Data Fetching
- `rerender-` for Re-render Optimization
- `rendering-` for Rendering Performance
- `js-` for JavaScript Performance
- `advanced-` for Advanced Patterns

### Step 2: Copy the Template

```bash
cp rules/_template.md rules/PREFIX-description.md
```

### Step 3: Fill in the Content

Edit your new rule file with:

**Required fields:**
- `title`: Short, descriptive title
- `impact`: One of: CRITICAL, HIGH, MEDIUM-HIGH, MEDIUM, LOW-MEDIUM, LOW
- `tags`: Comma-separated relevant tags

**Structure:**
- Problem explanation
- Incorrect (❌ BAD): Anti-pattern with description
- Correct (✅ GOOD): Recommended approach with description
- Files Affected: List of relevant codebase locations
- Related Patterns: Links to related skills
- Key Points: Bullet list of important details
- Reference: External documentation links

### Step 4: Validate and Build

```bash
npm run dev
```

This will:
- Validate your rule structure
- Compile all rules into AGENTS.md
- Extract test cases

## Rule File Format

### Frontmatter

```yaml
---
title: Rule Title Here
impact: MEDIUM
impactDescription: Optional description of specific impact
tags: tag1, tag2, tag3
---
```

### Content Structure

```markdown
## Rule Title Here

Brief explanation of the rule and why it matters.

### Incorrect (description of what's wrong)

```typescript
// ❌ BAD: Description
const result = await fetch("...");
```

### Correct (description of what's right)

```typescript
// ✅ GOOD: Description
const result = await fetch("...", { cache: "force-cache" });
```

### Files Affected
- `src/app/...`
- `src/components/...`

### Related Patterns
- [Related rule](./related-rule.md)

### Key Points
1. Point 1
2. Point 2

### Reference
[External link](https://example.com/)
```

## Integration Workflows

### For Code Review

1. When reviewing a PR, check relevant AGENTS.md sections
2. Ask reviewers if they followed these patterns
3. Reference specific rules if violations are found

### For CI/CD

Add skill validation to your CI pipeline:

```yaml
# Example GitHub Actions workflow
- name: Validate Best Practices
  run: |
    cd skills/recipe-repository-best-practices
    npm run validate
```

### For IDE/Editor

Create a VS Code snippet referencing these rules:

```json
{
  "Apply Best Practice": {
    "prefix": "bp",
    "body": [
      "// See: skills/recipe-repository-best-practices/AGENTS.md",
      "// Section: ${1:section}",
      "// Rule: ${2:rule}"
    ]
  }
}
```

### For Git Commits

Reference skills in commit messages:

```
Implement SWR for recipe data fetching

- Uses client-swr-deduplication skill
- Replaces manual fetch with automatic caching
- Fixes duplicate request issues

Refs: skills/recipe-repository-best-practices/rules/client-swr-deduplication.md
```

## Extending the Skills

### Add New Rule Categories

1. Add new prefix to `_sections.md`
2. Update `src/build.ts` with new `sectionOrder` and `sectionTitles`
3. Create rules with new prefix

### Add Cross-Project Skills

Create sister skill sets in other projects:

```bash
skills/
├── recipe-repository-best-practices/
├── backend-performance-patterns/
├── database-optimization-skills/
└── testing-strategies/
```

## Files Affected Index

This skill set currently addresses issues in:

**API Routes:**
- `src/app/api/recipes/route.ts`
- `src/app/api/recipes/[id]/route.ts`
- `src/app/api/meal-plans/route.ts`
- `src/app/api/meal-plans/[id]/route.ts`

**Pages:**
- `src/app/recipes/page.tsx`
- `src/app/recipes/[id]/page.tsx`
- `src/app/recipes/new/page.tsx`
- `src/app/meal-plans/page.tsx`
- `src/app/meal-plans/[id]/page.tsx`
- `src/app/recipes/upload/page.tsx`

**Components:**
- `src/components/Navigation.tsx`
- `src/components/Providers.tsx`

**Libraries:**
- `src/lib/uploader/ingredientParser.ts`
- `src/lib/uploader/ocr.ts`

## Measuring Impact

### Metrics to Track

1. **Bundle Size**: Use `next/bundle-analyzer`
2. **Core Web Vitals**: Monitor LCP, FID, CLS
3. **API Response Times**: Check database query times
4. **Re-render Count**: Profile with React DevTools

### Success Criteria

- ✅ Bundle size reduced by 15-20%
- ✅ LCP improved by 30-50ms
- ✅ API response times halved
- ✅ List rendering 3x faster
- ✅ No additional maintenance overhead

## Updates and Maintenance

### Version Management

Skills follow semantic versioning in `metadata.json`:
- `MAJOR`: Breaking changes to skill structure
- `MINOR`: New skills added
- `PATCH`: Existing skills clarified/improved

### Keeping Skills Fresh

1. Review skills quarterly
2. Update based on real-world application changes
3. Add new skills as patterns emerge
4. Mark deprecated skills with notice

## Related Resources

- [Original Vercel React Best Practices](https://github.com/vercel-labs/agent-skills)
- [React Documentation](https://react.dev/)
- [Next.js Performance Guide](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web Performance Working Group](https://www.w3.org/webperf/)

## FAQ

**Q: Can non-AI developers use these skills?**
A: Yes! Read AGENTS.md or individual rule files for practical guidance.

**Q: How often should skills be applied?**
A: Aim to apply 1-2 high-impact skills per sprint.

**Q: What if a skill doesn't apply to our codebase?**
A: Document why in a comment referencing the rule.

**Q: Can we share these skills with other projects?**
A: Yes! Copy the `skills/` directory to another project and customize.

**Q: How do we handle disagreements about a skill?**
A: Open a discussion, consider the trade-offs, update the rule if needed.

## Support

For issues or suggestions:
1. Create a GitHub issue with the skill name
2. Reference the specific rule file
3. Explain why the skill needs updating

---

**Last Updated**: February 2026  
**Version**: 1.0.0  
**Maintainers**: Recipe Repository Team
