import { getIngredientDensity } from "@/lib/uploader/ingredientDensity";
import { roundQuantity, sanitizeServingCount } from "@/lib/utils/scaling";
import { getNutritionProfileByIngredient } from "@/lib/nutrition/database";
import type {
  IngredientNutritionBreakdown,
  NutritionProfile,
  RecipeNutritionSummary,
} from "@/lib/nutrition/types";

type IngredientInput = {
  name: string;
  quantity: number;
  unit: string;
  canonicalQuantity?: number | null;
  canonicalUnit?: string | null;
};

const UNIT_TO_G = new Map<string, number>([
  ["g", 1],
  ["gram", 1],
  ["grams", 1],
  ["kg", 1000],
  ["kilogram", 1000],
  ["oz", 28.35],
  ["ounce", 28.35],
  ["ounces", 28.35],
  ["lb", 453.592],
  ["pound", 453.592],
  ["pounds", 453.592],
]);

const UNIT_TO_ML = new Map<string, number>([
  ["ml", 1],
  ["l", 1000],
  ["liter", 1000],
  ["liters", 1000],
  ["cup", 240],
  ["cups", 240],
  ["tbsp", 15],
  ["tablespoon", 15],
  ["tablespoons", 15],
  ["tsp", 5],
  ["teaspoon", 5],
  ["teaspoons", 5],
]);

function emptyNutrition(): NutritionProfile {
  return {
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    fiberG: 0,
    sugarG: 0,
    sodiumMg: 0,
  };
}

function scaleNutrition(per100g: NutritionProfile, grams: number): NutritionProfile {
  const factor = grams / 100;
  return {
    calories: roundQuantity(per100g.calories * factor),
    proteinG: roundQuantity(per100g.proteinG * factor),
    carbsG: roundQuantity(per100g.carbsG * factor),
    fatG: roundQuantity(per100g.fatG * factor),
    fiberG: roundQuantity(per100g.fiberG * factor),
    sugarG: roundQuantity(per100g.sugarG * factor),
    sodiumMg: roundQuantity(per100g.sodiumMg * factor),
  };
}

function addNutrition(a: NutritionProfile, b: NutritionProfile): NutritionProfile {
  return {
    calories: roundQuantity(a.calories + b.calories),
    proteinG: roundQuantity(a.proteinG + b.proteinG),
    carbsG: roundQuantity(a.carbsG + b.carbsG),
    fatG: roundQuantity(a.fatG + b.fatG),
    fiberG: roundQuantity(a.fiberG + b.fiberG),
    sugarG: roundQuantity(a.sugarG + b.sugarG),
    sodiumMg: roundQuantity(a.sodiumMg + b.sodiumMg),
  };
}

function divideNutrition(value: NutritionProfile, divisor: number): NutritionProfile {
  return {
    calories: roundQuantity(value.calories / divisor),
    proteinG: roundQuantity(value.proteinG / divisor),
    carbsG: roundQuantity(value.carbsG / divisor),
    fatG: roundQuantity(value.fatG / divisor),
    fiberG: roundQuantity(value.fiberG / divisor),
    sugarG: roundQuantity(value.sugarG / divisor),
    sodiumMg: roundQuantity(value.sodiumMg / divisor),
  };
}

function toWeightInGrams(ingredient: IngredientInput): number | null {
  const canonicalUnit = ingredient.canonicalUnit?.toLowerCase() || "";
  const canonicalQuantity = ingredient.canonicalQuantity ?? null;
  if (canonicalQuantity && canonicalUnit === "g") return canonicalQuantity;

  if (canonicalQuantity && canonicalUnit === "ml") {
    const density = getIngredientDensity(ingredient.name);
    return density ? roundQuantity(canonicalQuantity * density) : null;
  }

  const unit = (ingredient.unit || "").toLowerCase();
  if (!ingredient.quantity || ingredient.quantity <= 0) return null;

  const directWeightFactor = UNIT_TO_G.get(unit);
  if (directWeightFactor) return roundQuantity(ingredient.quantity * directWeightFactor);

  const volumeFactor = UNIT_TO_ML.get(unit);
  if (volumeFactor) {
    const density = getIngredientDensity(ingredient.name);
    if (!density) return null;
    return roundQuantity(ingredient.quantity * volumeFactor * density);
  }

  return null;
}

export function calculateRecipeNutrition(
  ingredients: IngredientInput[],
  servings: number | undefined | null
): RecipeNutritionSummary {
  const perIngredient: IngredientNutritionBreakdown[] = [];
  let totalNutrition = emptyNutrition();
  const unmatchedIngredients: string[] = [];

  for (const ingredient of ingredients) {
    const profile = getNutritionProfileByIngredient(ingredient.name);
    if (!profile) {
      unmatchedIngredients.push(ingredient.name);
      perIngredient.push({
        name: ingredient.name,
        matched: false,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        reason: "No nutrition profile for ingredient",
      });
      continue;
    }

    const estimatedWeightG = toWeightInGrams(ingredient);
    if (!estimatedWeightG) {
      unmatchedIngredients.push(ingredient.name);
      perIngredient.push({
        name: ingredient.name,
        matched: false,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        reason: "Unable to estimate ingredient weight",
      });
      continue;
    }

    const nutrition = scaleNutrition(profile, estimatedWeightG);
    totalNutrition = addNutrition(totalNutrition, nutrition);
    perIngredient.push({
      name: ingredient.name,
      matched: true,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      estimatedWeightG,
      nutrition,
    });
  }

  const baseServings = sanitizeServingCount(servings);
  const perServing = divideNutrition(totalNutrition, baseServings);

  return {
    total: totalNutrition,
    perServing,
    baseServings,
    matchedIngredientCount: perIngredient.filter((item) => item.matched).length,
    unmatchedIngredients,
    perIngredient,
  };
}

export function scaleNutritionForServings(
  summary: RecipeNutritionSummary,
  targetServings: number
) {
  const safeTarget = sanitizeServingCount(targetServings);
  const factor = safeTarget / summary.baseServings;
  return {
    total: {
      calories: roundQuantity(summary.total.calories * factor),
      proteinG: roundQuantity(summary.total.proteinG * factor),
      carbsG: roundQuantity(summary.total.carbsG * factor),
      fatG: roundQuantity(summary.total.fatG * factor),
      fiberG: roundQuantity(summary.total.fiberG * factor),
      sugarG: roundQuantity(summary.total.sugarG * factor),
      sodiumMg: roundQuantity(summary.total.sodiumMg * factor),
    },
    perServing: summary.perServing,
    targetServings: safeTarget,
  };
}
