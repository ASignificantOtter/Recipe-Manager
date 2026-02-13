# Recipe Repository Best Practices - Quick Start

This directory contains reusable best practices skills for optimizing performance, data fetching, rendering, and architecture in the Recipe Repository project.

## Quick Start

### 1. Read the Skills

```bash
# View all skills compiled into agent-friendly format
cat AGENTS.md

# Or read individual skills
cat rules/async-parallel-promises.md
cat rules/client-swr-deduplication.md
```

### 2. Build Skills (Optional)

```bash
npm install
npm run dev
```

### 3. Apply to Your Code

Each rule includes:
- ❌ BAD examples showing what to avoid
- ✅ GOOD examples showing the correct pattern
- Files affected in your codebase
- Links to external documentation

## Available Skills (by impact)

### 🔴 CRITICAL (Start Here)

1. **[Parallelize Promise Operations](rules/async-parallel-promises.md)** - Use Promise.all() for independent async operations
2. **[Use Dynamic Imports for Large Components](rules/bundle-dynamic-imports.md)** - Code-split heavy dependencies
3. **[Implement React Suspense for Streaming](rules/async-suspense-boundaries.md)** - Progressive rendering with Suspense

### 🟠 HIGH

4. **[Use React.cache for Query Deduplication](rules/server-query-deduplication.md)** - Eliminate duplicate database queries

### 🟡 MEDIUM-HIGH

5. **[Use SWR for Client-Side Data Fetching](rules/client-swr-deduplication.md)** - Automatic caching and deduplication

### 🟢 MEDIUM

6. **[Memoize Event Handlers with useCallback](rules/rerender-callback-memoization.md)** - Prevent child re-renders
7. **[Memoize List Item Components with React.memo](rules/rerender-component-memoization.md)** - Optimize list rendering

## How to Use

### For AI Agents

Agents can reference `AGENTS.md` for all compiled skills with:
- Structured rule format
- Impact levels for prioritization
- Code patterns and anti-patterns
- Affected files in the repository

### For Developers

1. Find relevant skills by section or impact level
2. Read the "Incorrect" and "Correct" examples
3. Check "Files Affected" for where to apply
4. Follow the pattern in your code
5. Reference the skill in code comments

### For Code Reviews

Reference specific skills when reviewing:
```
This could use the "Parallelize Promise Operations" skill:
See: rules/async-parallel-promises.md
```

## Creating New Skills

1. Copy `rules/_template.md` to `rules/PREFIX-name.md`
2. Use correct prefix: `async-`, `bundle-`, `client-`, `server-`, `rerender-`, etc.
3. Fill frontmatter and examples
4. Run `npm run dev` to validate and build

See [SKILL.md](SKILL.md) for detailed documentation.

## Next Steps

1. **This Week**: Read rules in AGENTS.md (30 min)
2. **Week 1**: Apply 2-3 critical skills to key files
3. **Week 2**: Apply medium-priority skills
4. **Month 1**: Create custom skills for your patterns

## Project Status

Skills extracted from comprehensive best practices review (Feb 2026):
- ✅ 7 core skills implemented
- ✅ Build system ready
- ✅ Agent-friendly AGENTS.md generated
- 🎯 Ready for distribution and use in future projects

---

For full documentation, see [SKILL.md](SKILL.md)
