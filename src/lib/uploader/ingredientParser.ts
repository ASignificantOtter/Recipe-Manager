type ParsedIngredient = {
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
  canonicalUnit?: string;
  canonicalQuantity?: number;
};

const UNITS = [
  "cup",
  "cups",
  "tablespoon",
  "tablespoons",
  "tbsp",
  "teaspoon",
  "teaspoons",
  "tsp",
  "gram",
  "grams",
  "g",
  "kg",
  "kilogram",
  "ml",
  "l",
  "liter",
  "ounce",
  "ounces",
  "oz",
  "pound",
  "pounds",
  "lb",
  "pinch",
  "clove",
  "cloves",
  "slice",
  "slices",
];

const UNIT_ALIASES: Record<string, string> = {
  cups: "cup",
  tablespoons: "tbsp",
  tablespoon: "tbsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  grams: "g",
  gram: "g",
  kilograms: "kg",
  litres: "l",
  liters: "l",
  ounces: "oz",
  pounds: "lb",
};

// simple conversions to metric base units (ml for volume, g for weight)
const CONVERSIONS: Record<string, { to: string; factor: number }> = {
  cup: { to: "ml", factor: 240 },
  tbsp: { to: "ml", factor: 15 },
  tsp: { to: "ml", factor: 5 },
  l: { to: "ml", factor: 1000 },
  ml: { to: "ml", factor: 1 },
  g: { to: "g", factor: 1 },
  kg: { to: "g", factor: 1000 },
  oz: { to: "g", factor: 28.35 },
  lb: { to: "g", factor: 453.592 },
};

function parseFraction(token: string): number | null {
  // Accept forms: "1", "1.5", "1/2", "1 1/2"
  token = token.trim();
  if (!token) return null;
  // mixed number
  const mixed = token.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const a = parseInt(mixed[1], 10);
    const b = parseInt(mixed[2], 10);
    const c = parseInt(mixed[3], 10);
    if (c === 0) return null;
    return a + b / c;
  }
  // simple fraction
  const frac = token.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    const a = parseInt(frac[1], 10);
    const b = parseInt(frac[2], 10);
    if (b === 0) return null;
    return a / b;
  }
  // decimal or integer
  const num = Number(token.replace(/[^0-9\.]/g, ""));
  if (!Number.isFinite(num)) return null;
  return num;
}

export function parseIngredient(line: string): ParsedIngredient {
  const original = line.trim();
  let quantity = 0;
  let unit = "";
  let name = original;

  if (!original) return { name: "", quantity: 0, unit: "" };

  // split tokens
  const tokens = original.split(/\s+/);

  // try first 2 tokens for quantity (support "1 1/2")
  let qtyToken = tokens[0] || "";
  let second = tokens[1] || "";
  let parsedQty = parseFraction(qtyToken);
  // handle mixed fraction like "1 1/2"
  if (second && /^\d+\/(\d+)$/.test(second)) {
    const mixed = parseFraction(qtyToken + " " + second);
    if (mixed !== null) parsedQty = mixed;
  }

  if (parsedQty !== null) {
    quantity = parsedQty;
    // remove qty tokens (two tokens if mixed fraction like "1 1/2")
    const removeCount = second && /^\d+\/(\d+)$/.test(second) ? 2 : 1;
    tokens.splice(0, removeCount);

    // next token might be unit
    const maybeUnit = tokens[0] ? tokens[0].toLowerCase().replace(/[^a-z]/g, "") : "";
    if (UNITS.includes(maybeUnit)) {
      unit = maybeUnit;
      tokens.splice(0, 1);
    }
  } else {
    // no numeric quantity found — try to detect patterns like "a pinch", "pinch of salt"
    const low = original.toLowerCase();
    for (const u of ["pinch", "dash"]) {
      if (low.startsWith(u)) {
        unit = u;
        // remove unit word
        const rest = original.slice(u.length).trim();
        name = rest.replace(/^of\s+/i, "");
        return { name, quantity: 0, unit };
      }
    }
  }

  // remaining tokens are the ingredient name and maybe notes
  name = tokens.join(" ").trim();

  // If name contains "," or "(" treat after as notes
  let notes = "";
  const noteMatch = name.match(/(.*?)\s*[,(]\s*(.*)$/);
  if (noteMatch) {
    name = noteMatch[1].trim();
    notes = noteMatch[2].trim();
  }

  return { name, quantity, unit, notes };
}

export function normalizeParsedIngredient(parsed: ParsedIngredient): ParsedIngredient {
  const res: ParsedIngredient = { ...parsed };
  const unitLow = (parsed.unit || "").toLowerCase();
  const alias = UNIT_ALIASES[unitLow] || unitLow;
  res.canonicalUnit = alias;

  const conv = CONVERSIONS[alias];
  if (conv && parsed.quantity && parsed.quantity > 0) {
    res.canonicalQuantity = parsed.quantity * conv.factor;
    res.canonicalUnit = conv.to;
  } else if (conv) {
    // no quantity, still set canonicalUnit
    res.canonicalUnit = conv.to;
  }

  // If we have a volume in ml and we know a density for the ingredient, convert to grams
  const DENSITIES: Record<string, number> = {
    sugar: 0.85, // g/ml (granulated)
    flour: 0.53, // g/ml (all-purpose)
    butter: 0.911, // g/ml
    milk: 1.03, // g/ml
    water: 1.0,
    tomatoes: 0.95,
    "olive oil": 0.91,
  };

  if (res.canonicalUnit === "ml" && res.canonicalQuantity && res.canonicalQuantity > 0) {
    const nameLower = (parsed.name || "").toLowerCase();
    for (const key of Object.keys(DENSITIES)) {
      if (nameLower.includes(key)) {
        const density = DENSITIES[key];
        // convert ml -> g using density (g/ml)
        res.canonicalQuantity = Math.round(res.canonicalQuantity * density * 100) / 100;
        res.canonicalUnit = "g";
        break;
      }
    }
  }

  return res;
}


export default { parseIngredient };
