type RecipeData = {
  name: string;
  ingredients: string[];
  instructions: string;
};

function normalize(text: string) {
  return text.replace(/\r/g, "").replace(/\t/g, " ").replace(/\u00A0/g, " ").trim();
}

function splitLines(text: string) {
  return normalize(text)
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

// Normalize common OCR/typo variants for section headers
function normalizeForSectionMatch(text: string): string {
  return text
    .replace(/\blngredients?\b/gi, "ingredients")
    .replace(/\blnstructions?\b/gi, "instructions")
    .replace(/\bdlrections?\b/gi, "directions");
}

// Find position of first match of a pattern; returns { index, match } or null
function findFirstMatch(text: string, regex: RegExp): { index: number; match: string } | null {
  const m = text.match(regex);
  if (!m || m.index == null) return null;
  return { index: m.index, match: m[0] };
}

// Section headers: allow optional markdown #, word variants. Consume only same-line punctuation [ \t:]*
const INGREDIENTS_HEADER =
  /#*\s*\b(ingredients?|ingredient\s+list|what you('ll)?\s+need|you will need|lngredients?)\b[ \t:]*/i;
const INSTRUCTIONS_HEADER =
  /#*\s*\b(?!ingredients\b)(instructions?|directions?|method|steps?|preparation|how to make|procedure|lnstructions?)\b[ \t:]*/i;
const NOTES_HEADER = /#*\s*\b(notes?|tips|variations?|storage|leftovers?)\b[ \t:]*/i;
const NUTRITION_HEADER = /#*\s*\b(nutrition|nutrition facts?|calories)\b[ \t:]*/i;

// When finding where a section ends, only match headers at line start (avoid "ingredients" in "1. Mix ingredients")
const INGREDIENTS_HEADER_AT_LINE_START = /\n\s*#*\s*(ingredients?|ingredient\s+list|what you('ll)?\s+need|you will need|lngredients?)\b[ \t:]*/i;
const INSTRUCTIONS_HEADER_AT_LINE_START = /\n\s*#*\s*(instructions?|directions?|method|steps?|preparation|how to make|procedure|lnstructions?)\b[ \t:]*/i;
const NOTES_HEADER_AT_LINE_START = /\n\s*#*\s*(notes?|tips|variations?|storage|leftovers?)\b[ \t:]*/i;
const NUTRITION_HEADER_AT_LINE_START = /\n\s*#*\s*(nutrition|nutrition facts?|calories)\b[ \t:]*/i;

// Lines that are metadata and should not be treated as ingredients/instructions
const META_LINE = /^\s*(prep time|cook time|total time|course|cuisine|diet|servings?|author|rating|review|yield)\b\s*:?.*$/i;
const URL_LINE = /^https?:\/\//i;

// Sub-headers we strip from the ingredients list (e.g. "Dry Ingredients:", "For the dough:")
const INGREDIENT_SUBHEADER = /^\s*(for the\s+.+|(dry|wet|optional|main)\s+ingredients?|ingredients?\s+for)\s*:?\s*$/i;

export function simpleParseRecipe(text: string): RecipeData {
  const raw = normalize(text);
  const src = normalizeForSectionMatch(raw);

  const ingMatch = findFirstMatch(src, INGREDIENTS_HEADER);
  const instMatch = findFirstMatch(src, INSTRUCTIONS_HEADER);

  let title = "";
  let ingredients: string[] = [];
  let instructions: string[] = [];

  // Numbered step (e.g. "1. Preheat oven") is instruction, not ingredient
  const isNumberedStep = (line: string) => /^\d+[.)]\s/.test(line);
  const isIngredientLike = (line: string) => {
    if (!line) return false;
    if (isNumberedStep(line)) return false;
    if (META_LINE.test(line)) return false;
    if (URL_LINE.test(line)) return false;
    if (NOTES_HEADER.test(line) || NUTRITION_HEADER.test(line)) return false;
    if (/^[-\*\u2022]\s*/.test(line)) return true;
    // "1 cup flour" or "2 tbsp" — quantity then optional fraction then space (no period after number)
    if (/^\d+\s*\/?\s*\d*\s+/.test(line) && !/^\d+\.\s/.test(line)) return true;
    if (/\b(cup|cups|tablespoon|tbsp|teaspoon|tsp|grams?|g\b|ml|ounce|oz|pound|lb)\b/i.test(line)) return true;
    return false;
  };

  const firstSectionIdx = Math.min(
    ingMatch?.index ?? Infinity,
    instMatch?.index ?? Infinity
  );
  const beforeSection = src.slice(0, firstSectionIdx).trim();
  const firstLine = splitLines(beforeSection)[0] || "";
  title = firstLine.replace(/^#+\s*/, "").trim();

  if (ingMatch !== null || instMatch !== null) {
    // Ingredients: from end of first ingredients header to start of first instructions header (or end)
    if (ingMatch !== null) {
      const afterHeader = src.slice(ingMatch.index + ingMatch.match.length).trim();
      const instStart = afterHeader.search(INSTRUCTIONS_HEADER_AT_LINE_START);
      const notesStart = afterHeader.search(NOTES_HEADER_AT_LINE_START);
      const nutritionStart = afterHeader.search(NUTRITION_HEADER_AT_LINE_START);
      const blockEnd = [instStart, notesStart, nutritionStart]
        .filter((v) => v !== -1)
        .reduce((min, v) => Math.min(min, v), Infinity);
      const ingBlock = blockEnd === Infinity ? afterHeader : afterHeader.slice(0, blockEnd).trim();
      const lines = splitLines(ingBlock)
        .map((l) => l.replace(/^[-\*\u2022]\s*/, "").replace(/^\d+[.)]\s*/, "").trim())
        .filter(
          (l) =>
            l.length > 0 &&
            !INGREDIENT_SUBHEADER.test(l) &&
            !META_LINE.test(l) &&
            !URL_LINE.test(l)
        );
      ingredients = lines;
    }

    // Instructions: from end of first instructions header to end (or next ingredients block at line start)
    if (instMatch !== null) {
      const afterHeader = src.slice(instMatch.index + instMatch.match.length).trim();
      const nextIng = afterHeader.search(INGREDIENTS_HEADER_AT_LINE_START);
      const notesStart = afterHeader.search(NOTES_HEADER_AT_LINE_START);
      const nutritionStart = afterHeader.search(NUTRITION_HEADER_AT_LINE_START);
      const blockEnd = [nextIng, notesStart, nutritionStart]
        .filter((v) => v !== -1)
        .reduce((min, v) => Math.min(min, v), Infinity);
      const instBlock = blockEnd === Infinity ? afterHeader : afterHeader.slice(0, blockEnd).trim();
      instructions = splitLines(instBlock)
        .filter((l) => l.length > 0 && !META_LINE.test(l) && !URL_LINE.test(l))
        .map((l) => l.replace(/^\d+[.)]\s*|^-\s*/, "").trim());
    }

    // Instructions header but no ingredients header: treat lines before instructions as title + possible ingredients
    if (instMatch !== null && ingMatch === null) {
      const beforeLines = splitLines(beforeSection).slice(1);
      const foundIngredients = beforeLines
        .filter(isIngredientLike)
        .map((l) => l.replace(/^[-\*\u2022]\s*/, "").trim());
      if (foundIngredients.length > 0) ingredients = foundIngredients;
      const prefixInstructions = beforeLines.filter((l) => !isIngredientLike(l));
      if (prefixInstructions.length > 0) instructions = [...prefixInstructions, ...instructions];
    }
  } else {
    // No explicit sections — heuristics
    const lines = splitLines(src);
    title = (lines[0] || "").replace(/^#+\s*/, "").trim();

    let inIngredients = false;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const like = isIngredientLike(line);
      if (like && !inIngredients) inIngredients = true;

      if (inIngredients) {
        if (!like && ingredients.length > 0) {
          inIngredients = false;
          if (!META_LINE.test(line) && !URL_LINE.test(line)) {
            instructions.push(line.replace(/^\d+[.)]\s*|^-\s*/, "").trim());
          }
        } else if (like) {
          ingredients.push(line.replace(/^[-\*\u2022]\s*/, "").trim());
        }
      } else {
        if (!META_LINE.test(line) && !URL_LINE.test(line)) {
          instructions.push(line.replace(/^\d+[.)]\s*|^-\s*/, "").trim());
        }
      }
    }
  }

  return {
    name: title,
    ingredients,
    instructions: instructions.filter(Boolean).join("\n"),
  };
}

export default { simpleParseRecipe };
