/**
 * MVP Unit Standardisation Rules
 *
 * Enforces strict representative units based on ingredient categories:
 *   Vegetables / Fruits / Eggs  → "ea" (each)
 *   Meat / Seafood / Pasta / Bulk Grains / Solid Dairy → "g" (grams)
 *   Liquid Dairy / Beverages    → "ml" (millilitres)
 */

export const VALID_UNITS = ['ea', 'g', 'ml'] as const
export type StandardUnit = (typeof VALID_UNITS)[number]

const UNIT_MAP: Record<string, StandardUnit> = {
  // Vegetables → ea
  tomatoes: 'ea',
  spinach: 'ea',
  onion: 'ea',
  garlic: 'ea',
  carrot: 'ea',
  capsicum: 'ea',
  mushroom: 'ea',
  broccoli: 'ea',
  cauliflower: 'ea',
  zucchini: 'ea',
  eggplant: 'ea',
  potato: 'ea',
  'sweet potato': 'ea',
  lettuce: 'ea',
  cucumber: 'ea',
  corn: 'ea',
  peas: 'ea',
  beans: 'ea',
  chickpeas: 'ea',
  // Fruits / Herbs → ea
  lemon: 'ea',
  basil: 'ea',
  parsley: 'ea',
  banana: 'ea',
  // Eggs → ea
  eggs: 'ea',
  // Meat / Seafood → g
  chicken: 'g',
  beef: 'g',
  pork: 'g',
  fish: 'g',
  shrimp: 'g',
  // Pasta / Bulk Grains → g
  pasta: 'g',
  rice: 'g',
  oats: 'g',
  bread: 'g',
  // Solid Dairy → g
  cheese: 'g',
  butter: 'g',
  // Tofu → g
  tofu: 'g',
  // Liquid Dairy → ml
  milk: 'ml',
  yogurt: 'ml',
  // Olive oil (common in recipes)
  'olive oil': 'ml',
}

/** Returns the enforced MVP unit for a given ingredient name. Defaults to 'ea'. */
export const getUnitForIngredient = (name: string): StandardUnit => {
  const normalised = name.trim().toLowerCase()
  return UNIT_MAP[normalised] ?? 'ea'
}