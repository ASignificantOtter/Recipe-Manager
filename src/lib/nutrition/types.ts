export type NutritionProfile = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
};

export type IngredientNutritionBreakdown = {
  name: string;
  matched: boolean;
  reason?: string;
  quantity?: number;
  unit?: string;
  estimatedWeightG?: number;
  nutrition?: NutritionProfile;
};

export type RecipeNutritionSummary = {
  total: NutritionProfile;
  perServing: NutritionProfile;
  baseServings: number;
  matchedIngredientCount: number;
  unmatchedIngredients: string[];
  perIngredient: IngredientNutritionBreakdown[];
};
