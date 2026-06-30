type IngredientDensityEntry = {
  canonicalName: string;
  density: number; // g/ml
  aliases: string[];
};

const INGREDIENT_DENSITY_ENTRIES: IngredientDensityEntry[] = [
  { canonicalName: "sugar", density: 0.85, aliases: ["granulated sugar", "white sugar", "caster sugar"] },
  { canonicalName: "flour", density: 0.53, aliases: ["all-purpose flour", "ap flour", "plain flour"] },
  { canonicalName: "butter", density: 0.911, aliases: ["unsalted butter", "salted butter"] },
  { canonicalName: "milk", density: 1.03, aliases: ["whole milk", "skim milk"] },
  { canonicalName: "water", density: 1.0, aliases: [] },
  { canonicalName: "tomatoes", density: 0.95, aliases: ["tomato", "chopped tomatoes", "diced tomatoes"] },
  { canonicalName: "olive oil", density: 0.91, aliases: ["extra virgin olive oil", "evoo"] },
  { canonicalName: "onion", density: 0.94, aliases: ["onions", "yellow onion", "red onion", "white onion"] },
  { canonicalName: "carrot", density: 0.64, aliases: ["carrots"] },
  { canonicalName: "baking powder", density: 0.9, aliases: [] },
  { canonicalName: "yeast", density: 0.8, aliases: ["active dry yeast", "instant yeast"] },
  { canonicalName: "honey", density: 1.42, aliases: [] },
  { canonicalName: "brown sugar", density: 0.72, aliases: ["light brown sugar", "dark brown sugar"] },
];

const normalizeIngredientText = (value: string) =>
  value
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const DENSITY_LOOKUP = new Map<string, number>();

for (const entry of INGREDIENT_DENSITY_ENTRIES) {
  DENSITY_LOOKUP.set(normalizeIngredientText(entry.canonicalName), entry.density);
  for (const alias of entry.aliases) {
    DENSITY_LOOKUP.set(normalizeIngredientText(alias), entry.density);
  }
}

export function getIngredientDensity(name: string): number | undefined {
  const normalized = normalizeIngredientText(name);
  if (!normalized) return undefined;

  const exact = DENSITY_LOOKUP.get(normalized);
  if (exact !== undefined) return exact;

  for (const [key, density] of DENSITY_LOOKUP.entries()) {
    if (normalized.includes(key)) return density;
  }
  return undefined;
}

export function getSupportedDensityIngredients() {
  return INGREDIENT_DENSITY_ENTRIES.map((entry) => entry.canonicalName);
}

