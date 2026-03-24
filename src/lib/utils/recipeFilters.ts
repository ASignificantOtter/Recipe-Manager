export interface RecipeFilters {
  search?: string;
  tags?: string[];
  maxPrepTime?: number;
  maxCookTime?: number;
}

/**
 * Builds a Prisma `where` clause for recipe queries.
 * Exported as a pure function so it can be unit-tested independently.
 */
export function buildRecipeWhereClause(
  userId: string,
  filters: RecipeFilters = {}
) {
  const where: Record<string, unknown> = { userId };

  if (filters.search?.trim()) {
    where.name = { contains: filters.search.trim(), mode: "insensitive" };
  }

  if (filters.tags && filters.tags.length > 0) {
    where.dietaryTags = { hasEvery: filters.tags };
  }

  if (filters.maxPrepTime !== undefined && !isNaN(filters.maxPrepTime)) {
    where.prepTime = { lte: filters.maxPrepTime };
  }

  if (filters.maxCookTime !== undefined && !isNaN(filters.maxCookTime)) {
    where.cookTime = { lte: filters.maxCookTime };
  }

  return where;
}

/**
 * Builds a URL query string from recipe filters for use with SWR keys.
 */
export function buildRecipesQueryString(filters: RecipeFilters): string {
  const params = new URLSearchParams();

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }

  filters.tags?.forEach((tag) => {
    if (tag) params.append("tags", tag);
  });

  if (filters.maxPrepTime !== undefined) {
    params.set("maxPrepTime", String(filters.maxPrepTime));
  }

  if (filters.maxCookTime !== undefined) {
    params.set("maxCookTime", String(filters.maxCookTime));
  }

  const qs = params.toString();
  return qs ? `/api/recipes?${qs}` : "/api/recipes";
}
