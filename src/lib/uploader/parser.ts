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

function extractSection(text: string, header: string) {
  const re = new RegExp(`${header}[:\s]*`, "i");
  const idx = text.search(re);
  if (idx === -1) return null;
  // return rest after header
  return text.slice(idx + text.match(re)![0].length).trim();
}

export function simpleParseRecipe(text: string): RecipeData {
  const src = normalize(text);

  // Look for explicit sections
  const ingredientsSectionMatch = src.match(/ingredients[:\n\r]/i);
  const instructionsSectionMatch = src.match(/instructions[:\n\r]|directions[:\n\r]|method[:\n\r]/i);

  let title = "";
  let ingredients: string[] = [];
  let instructions: string[] = [];

  const isIngredientLike = (line: string) => {
    if (!line) return false;
    if (/^[-\*\u2022]/.test(line)) return true;
    if (/^\d+\/?\d*\s+/i.test(line)) return true;
    if (/\b(cup|tablespoon|tbsp|teaspoon|tsp|grams|g|ml|ounce|oz|pound|lb)\b/i.test(line)) return true;
    return false;
  };

  if (ingredientsSectionMatch || instructionsSectionMatch) {
    // title = first line before any section header
    const firstHeaderIdx = Math.min(
      ingredientsSectionMatch ? ingredientsSectionMatch.index! : Infinity,
      instructionsSectionMatch ? instructionsSectionMatch.index! : Infinity
    );
    const before = src.slice(0, firstHeaderIdx).trim();
    title = splitLines(before)[0] || "";

    // Extract ingredients block
    if (ingredientsSectionMatch) {
      const afterIngredients = extractSection(src, "ingredients") || "";
      // Stop at next section header if present
      const stopAt = afterIngredients.search(/\n\s*(instructions|directions|method)[:\s]/i);
      const ingText = stopAt === -1 ? afterIngredients : afterIngredients.slice(0, stopAt);
      ingredients = splitLines(ingText).map((l) => l.replace(/^[-\*\u2022]\s*/, "").trim()).filter(Boolean);
    }

    // Extract instructions block
    if (instructionsSectionMatch) {
      const afterInst = extractSection(src, instructionsSectionMatch[0].replace(/[:\s]*$/i, "")) || "";
      const stopAt = afterInst.search(/\n\s*(ingredients)[:\s]/i);
      const instText = stopAt === -1 ? afterInst : afterInst.slice(0, stopAt);
      instructions = splitLines(instText).map((l) => l.replace(/^\d+\.|^-\s*/, "").trim());
    }
    // If there's an instructions header but no ingredients header, try to extract ingredients
    if (instructionsSectionMatch && !ingredientsSectionMatch) {
      const beforeLines = splitLines(before).slice(1);
      const foundIngredients = beforeLines.filter(isIngredientLike).map((l) => l.replace(/^[-\*\u2022]\s*/, "").trim());
      if (foundIngredients.length > 0) {
        ingredients = foundIngredients;
      }
      // any non-ingredient lines before header after title -> treat as instructions prefix
      const foundInstructions = beforeLines.filter((l) => !isIngredientLike(l));
      if (foundInstructions.length > 0) {
        instructions = [...foundInstructions, ...instructions];
      }
    }
  } else {
    // No explicit sections — heuristics
    const lines = splitLines(src);
    title = lines[0] || "";

    let inIngredients = false;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const like = isIngredientLike(line);
      if (like && !inIngredients) {
        inIngredients = true;
      }

      if (inIngredients) {
        if (!like && ingredients.length > 0) {
          // switch to instructions after ingredient block ends
          inIngredients = false;
          instructions.push(line);
        } else {
          ingredients.push(line.replace(/^[-\*\u2022]\s*/, "").trim());
        }
      } else {
        instructions.push(line);
      }
    }
  }

  return {
    name: title,
    ingredients,
    instructions: instructions.join("\n"),
  };
}

export default { simpleParseRecipe };
