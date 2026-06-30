export function sanitizeServingCount(value: number | undefined | null) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return 1;
  return value;
}

export function roundQuantity(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function getScalingMultiplier(baseServings: number | undefined | null, targetServings: number | undefined | null) {
  const base = sanitizeServingCount(baseServings);
  const target = sanitizeServingCount(targetServings);
  return target / base;
}

export function scaleQuantity(
  quantity: number,
  baseServings: number | undefined | null,
  targetServings: number | undefined | null
) {
  if (!Number.isFinite(quantity)) return 0;
  const multiplier = getScalingMultiplier(baseServings, targetServings);
  return roundQuantity(quantity * multiplier);
}

