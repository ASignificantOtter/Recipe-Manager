# Using Recipe Repository Best Practices Skills

This repository now includes a comprehensive, reusable skill set extracted from the best practices review. These skills are organized, modular, and ready to be applied to your codebase or shared with other projects.

## Quick Start - What to Do Now

### 1. Read the Complete Skills Guide

```bash
cat skills/recipe-repository-best-practices/AGENTS.md
```

This is the compiled, agent-optimized format with all 7 skills.

### 2. Review Skills by Impact Level

**Start with CRITICAL (highest impact):**
- [Parallelize Promise Operations](skills/recipe-repository-best-practices/rules/async-parallel-promises.md)
- [Use Dynamic Imports for Large Components](skills/recipe-repository-best-practices/rules/bundle-dynamic-imports.md)  
- [Implement React Suspense for Streaming](skills/recipe-repository-best-practices/rules/async-suspense-boundaries.md)

**Then HIGH priority:**
- [Use React.cache for Query Deduplication](skills/recipe-repository-best-practices/rules/server-query-deduplication.md)

**Then MEDIUM-HIGH:**
- [Use SWR for Client-Side Data Fetching](skills/recipe-repository-best-practices/rules/client-swr-deduplication.md)

**Then MEDIUM:**
- [Memoize Event Handlers with useCallback](skills/recipe-repository-best-practices/rules/rerender-callback-memoization.md)
- [Memoize List Item Components with React.memo](skills/recipe-repository-best-practices/rules/rerender-component-memoization.md)

### 3. Apply to Your Code

Each skill includes:
- ❌ **BAD**: Anti-pattern to avoid
- ✅ **GOOD**: Recommended approach
- **Files Affected**: Where to apply in your codebase
- **Examples**: Copy-paste ready code

## Directory Structure

```
skills/recipe-repository-best-practices/
├── AGENTS.md                    ← Read this first (compiled skills)
├── SKILL.md                     ← Complete documentation
├── README.md                    ← Quick reference
├── package.json
├── metadata.json                
├── rules/                       ← Individual skill files
│   ├── _template.md            (template for new skills)
│   ├── _sections.md            (metadata)
│   ├── async-parallel-promises.md
│   ├── async-suspense-boundaries.md
│   ├── bundle-dynamic-imports.md
│   ├── client-swr-deduplication.md
│   ├── rerender-callback-memoization.md
│   ├── rerender-component-memoization.md
│   └── server-query-deduplication.md
└── src/                         ← Build utilities
    ├── build.js                 (compile rules → AGENTS.md)
    └── validate.js              (validate rule files)
```

## What's Included

### 7 Core Skills

| Skill | Type | Impact | File |
|-------|------|--------|------|
| Parallelize Promise Operations | Async | CRITICAL | async-parallel-promises.md |
| Dynamic Imports for Components | Bundle | CRITICAL | bundle-dynamic-imports.md |
| React Suspense for Streaming | Async | CRITICAL | async-suspense-boundaries.md |
| React.cache Query Deduplication | Server | HIGH | server-query-deduplication.md |
| SWR for Client Data Fetching | Client | MEDIUM-HIGH | client-swr-deduplication.md |
| useCallback for Event Handlers | Re-render | MEDIUM | rerender-callback-memoization.md |
| React.memo for List Items | Re-render | MEDIUM | rerender-component-memoization.md |

### Build System

- ✅ Automatic rule compilation to AGENTS.md
- ✅ Validation of rule structure
- ✅ Agent-friendly output format
- ✅ Extensible template system

### Files Affected

Skills address optimization opportunities in:
- `src/app/api/` - All API routes
- `src/app/recipes/` - Recipe pages and components
- `src/app/meal-plans/` - Meal plan pages and components
- `src/components/` - Reusable components
- `src/lib/` - Utility functions

## How to Use These Skills

### For Development

1. **Find a skill** by section or impact level
2. **Read the examples** (bad vs good)
3. **Check "Files Affected"** to locate relevant code
4. **Apply the pattern** following the recommendation
5. **Reference in comments**: `// See: skills/.../rules/rule-name.md`

Example commit message:
```
Apply SWR for recipe data fetching

- Uses client-swr-deduplication skill
- Replaces manual fetch with SWR
- Adds automatic caching and deduplication

Refs: skills/recipe-repository-best-practices/rules/client-swr-deduplication.md
```

### For Code Review

Reference skills in PR comments:
```
This could benefit from the "Parallelize Promise Operations" skill:
See: skills/recipe-repository-best-practices/rules/async-parallel-promises.md

Instead of sequential awaits, use Promise.all() to parallelize...
```

### For AI Agents

Provide the AGENTS.md file:
```bash
cat skills/recipe-repository-best-practices/AGENTS.md
```

Agents get:
- All rules organized by section
- Impact levels for prioritization
- Code examples (bad and good)
- Affected files
- Related patterns
- External references

## Building and Extending

### Rebuild Skills

After modifying rules:
```bash
cd skills/recipe-repository-best-practices
npm run build
```

### Add New Skills

1. Copy template:
   ```bash
   cp skills/recipe-repository-best-practices/rules/_template.md \
      skills/recipe-repository-best-practices/rules/PREFIX-name.md
   ```

2. Edit the new file with your skill

3. Use correct prefix:
   - `async-` - Eliminating Waterfalls
   - `bundle-` - Bundle Size Optimization
   - `server-` - Server-Side Performance
   - `client-` - Client-Side Data Fetching
   - `rerender-` - Re-render Optimization
   - `rendering-` - Rendering Performance
   - `js-` - JavaScript Performance
   - `advanced-` - Advanced Patterns

4. Rebuild:
   ```bash
   npm run build
   ```

For detailed documentation, see [SKILL.md](skills/recipe-repository-best-practices/SKILL.md)

## Integration Ideas

### GitHub CI/CD

Add validation to your workflow:
```yaml
- name: Validate Best Practices Skills
  run: node skills/recipe-repository-best-practices/src/build.js
```

### VS Code Snippets

Create a snippet file:
```json
{
  "Apply Best Practice": {
    "prefix": "bp",
    "body": ["// TODO: skill-${1:name}"]
  }
}
```

### Documentation

Link to specific skills in your ADRs (Architecture Decision Records):
```
## Why Promise.all()?

See best practices skill: skills/.../rules/async-parallel-promises.md
```

### Training

Use skills to onboard new team members:
1. Point to AGENTS.md
2. Focus on CRITICAL and HIGH priority rules first
3. Review patterns in code pull requests

## Impact Expectations

Applying these skills should result in:

- 📦 **15-20% bundle size reduction** (dynamic imports)
- ⚡ **30-50% latency improvement** (parallel operations)
- 🚀 **3x faster list rendering** (component memoization)
- 💾 **Eliminated duplicate queries** (caching)
- 🎯 **Better perceived performance** (SWR + Suspense)

## Sharing with Other Projects

This skill set is designed to be portable:

```bash
# Copy to another project
cp -r skills/recipe-repository-best-practices /path/to/other-project/skills/

# Customize metadata in that project
# Rebuild with new context
```

Each project can maintain its own skill variants or create shared skill packs.

## Documentation

- **[AGENTS.md](skills/recipe-repository-best-practices/AGENTS.md)** - Compiled all-in-one guide
- **[SKILL.md](skills/recipe-repository-best-practices/SKILL.md)** - Complete documentation and maintenance guide
- **[README.md](skills/recipe-repository-best-practices/README.md)** - Quick reference

## Next Steps

### Week 1
- [ ] Read AGENTS.md
- [ ] Pick 2 CRITICAL skills
- [ ] Apply to your codebase

### Week 2-3
- [ ] Apply HIGH priority skills
- [ ] Create PR with improvements
- [ ] Measure performance gains

### Month 1
- [ ] Apply MEDIUM priority skills
- [ ] Create custom skills for your patterns
- [ ] Document architectural decisions

### Ongoing
- [ ] Review skills in code reviews
- [ ] Add new skills as patterns emerge
- [ ] Update based on real-world feedback

## Questions?

See the comprehensive documentation:
- For usage: [README.md](skills/recipe-repository-best-practices/README.md)
- For details: [SKILL.md](skills/recipe-repository-best-practices/SKILL.md)
- For specific rules: [Individual rule files](skills/recipe-repository-best-practices/rules/)

---

**Last Updated**: February 12, 2026  
**Status**: Ready for use ✅  
**Portability**: High - Can be shared with other projects
