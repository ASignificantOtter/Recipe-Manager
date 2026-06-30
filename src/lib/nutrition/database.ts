import type { NutritionProfile } from "@/lib/nutrition/types";

type NutritionDbEntry = {
  canonicalName: string;
  aliases: string[];
  per100g: NutritionProfile;
};

export const NUTRITION_DB: NutritionDbEntry[] = [
  {
    canonicalName: "chicken breast",
    aliases: ["chicken", "boneless chicken breast"],
    per100g: { calories: 165, proteinG: 31, carbsG: 0, fatG: 3.6, fiberG: 0, sugarG: 0, sodiumMg: 74 },
  },
  {
    canonicalName: "rice",
    aliases: ["white rice", "cooked rice"],
    per100g: { calories: 130, proteinG: 2.4, carbsG: 28, fatG: 0.3, fiberG: 0.4, sugarG: 0.1, sodiumMg: 1 },
  },
  {
    canonicalName: "pasta",
    aliases: ["spaghetti", "noodles"],
    per100g: { calories: 131, proteinG: 5, carbsG: 25, fatG: 1.1, fiberG: 1.5, sugarG: 0.8, sodiumMg: 6 },
  },
  {
    canonicalName: "olive oil",
    aliases: ["extra virgin olive oil", "evoo"],
    per100g: { calories: 884, proteinG: 0, carbsG: 0, fatG: 100, fiberG: 0, sugarG: 0, sodiumMg: 2 },
  },
  {
    canonicalName: "butter",
    aliases: ["unsalted butter", "salted butter"],
    per100g: { calories: 717, proteinG: 0.9, carbsG: 0.1, fatG: 81, fiberG: 0, sugarG: 0.1, sodiumMg: 11 },
  },
  {
    canonicalName: "milk",
    aliases: ["whole milk", "skim milk"],
    per100g: { calories: 61, proteinG: 3.2, carbsG: 4.8, fatG: 3.3, fiberG: 0, sugarG: 5, sodiumMg: 43 },
  },
  {
    canonicalName: "flour",
    aliases: ["all-purpose flour", "ap flour", "plain flour"],
    per100g: { calories: 364, proteinG: 10.3, carbsG: 76.3, fatG: 1, fiberG: 2.7, sugarG: 0.3, sodiumMg: 2 },
  },
  {
    canonicalName: "sugar",
    aliases: ["granulated sugar", "white sugar", "brown sugar"],
    per100g: { calories: 387, proteinG: 0, carbsG: 100, fatG: 0, fiberG: 0, sugarG: 100, sodiumMg: 1 },
  },
  {
    canonicalName: "tomato",
    aliases: ["tomatoes", "diced tomatoes", "chopped tomatoes"],
    per100g: { calories: 18, proteinG: 0.9, carbsG: 3.9, fatG: 0.2, fiberG: 1.2, sugarG: 2.6, sodiumMg: 5 },
  },
  {
    canonicalName: "onion",
    aliases: ["onions", "yellow onion", "red onion", "white onion"],
    per100g: { calories: 40, proteinG: 1.1, carbsG: 9.3, fatG: 0.1, fiberG: 1.7, sugarG: 4.2, sodiumMg: 4 },
  },
  {
    canonicalName: "carrot",
    aliases: ["carrots"],
    per100g: { calories: 41, proteinG: 0.9, carbsG: 9.6, fatG: 0.2, fiberG: 2.8, sugarG: 4.7, sodiumMg: 69 },
  },
  {
    canonicalName: "egg",
    aliases: ["eggs"],
    per100g: { calories: 143, proteinG: 12.6, carbsG: 0.7, fatG: 9.5, fiberG: 0, sugarG: 0.4, sodiumMg: 140 },
  },
];

const normalizeName = (name: string) =>
  name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const lookup = new Map<string, NutritionProfile>();

for (const entry of NUTRITION_DB) {
  lookup.set(normalizeName(entry.canonicalName), entry.per100g);
  for (const alias of entry.aliases) {
    lookup.set(normalizeName(alias), entry.per100g);
  }
}

export function getNutritionProfileByIngredient(name: string): NutritionProfile | null {
  const normalized = normalizeName(name);
  if (!normalized) return null;

  const exact = lookup.get(normalized);
  if (exact) return exact;

  for (const [key, value] of lookup.entries()) {
    if (normalized.includes(key)) return value;
  }
  return null;
}

