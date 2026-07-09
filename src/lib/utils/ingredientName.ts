/**
 * Normalizes free-form ingredient names for stable matching:
 * - lowercases text
 * - removes parenthetical notes (e.g., "(diced)")
 * - strips punctuation/special characters
 * - collapses repeated whitespace
 */
export function normalizeIngredientName(value: string) {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
