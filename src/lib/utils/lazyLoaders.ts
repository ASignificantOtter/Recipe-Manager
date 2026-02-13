// Lazy-loaded parsing utilities to reduce initial bundle size
// These are only loaded when the upload page is accessed

export async function loadParserUtils() {
  const { parseIngredient, normalizeParsedIngredient } = await import(
    "@/lib/uploader/ingredientParser"
  );
  return { parseIngredient, normalizeParsedIngredient };
}

