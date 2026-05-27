export const MASTER_INGREDIENTS = [
  'milk',
  'eggs',
  'tomatoes',
  'spinach',
  'chicken',
  'rice',
  'pasta',
  'onion',
  'garlic',
  'carrot',
  'capsicum',
  'yogurt',
  'cheese',
  'mushroom',
  'beef',
  'pork',
  'fish',
  'shrimp',
  'tofu',
  'broccoli',
  'cauliflower',
  'zucchini',
  'eggplant',
  'potato',
  'sweet potato',
  'lettuce',
  'cucumber',
  'corn',
  'peas',
  'beans',
  'chickpeas',
  'oats',
  'bread',
  'butter',
  'lemon',
  'basil',
  'parsley',
  'banana',
] as const

export type IngredientCategory = 'vegetables' | 'fruits' | 'meat' | 'seafood' | 'dairy' | 'grains'

export const CATEGORIES: { key: IngredientCategory; label: string; icon: string }[] = [
  { key: 'vegetables', label: 'Vegetables', icon: '🥦' },
  { key: 'fruits', label: 'Fruits', icon: '🍎' },
  { key: 'meat', label: 'Meat', icon: '🥩' },
  { key: 'seafood', label: 'Seafood', icon: '🐟' },
  { key: 'dairy', label: 'Dairy', icon: '🥛' },
  { key: 'grains', label: 'Grains', icon: '🌾' },
]

export const INGREDIENT_CATEGORIES: Record<string, IngredientCategory> = {
  // Vegetables
  tomatoes: 'vegetables',
  spinach: 'vegetables',
  onion: 'vegetables',
  garlic: 'vegetables',
  carrot: 'vegetables',
  capsicum: 'vegetables',
  mushroom: 'vegetables',
  broccoli: 'vegetables',
  cauliflower: 'vegetables',
  zucchini: 'vegetables',
  eggplant: 'vegetables',
  potato: 'vegetables',
  'sweet potato': 'vegetables',
  lettuce: 'vegetables',
  cucumber: 'vegetables',
  corn: 'vegetables',
  peas: 'vegetables',
  beans: 'vegetables',
  chickpeas: 'vegetables',
  // Meat
  chicken: 'meat',
  beef: 'meat',
  pork: 'meat',
  tofu: 'meat',
  // Dairy
  milk: 'dairy',
  eggs: 'dairy',
  yogurt: 'dairy',
  cheese: 'dairy',
  butter: 'dairy',
  // Fruits
  lemon: 'fruits',
  banana: 'fruits',
  basil: 'fruits',
  parsley: 'fruits',
  // Seafood
  fish: 'seafood',
  shrimp: 'seafood',
  // Grains
  rice: 'grains',
  pasta: 'grains',
  oats: 'grains',
  bread: 'grains',
}

export const getCategoryForIngredient = (name: string): IngredientCategory => {
  const normalised = name.trim().toLowerCase()
  return INGREDIENT_CATEGORIES[normalised] ?? 'vegetables'
}

const levenshtein = (a: string, b: string) => {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[a.length][b.length]
}

export const validateIngredientName = (rawName: string) => {
  const normalized = rawName.trim().toLowerCase()
  if (!normalized) return { finalName: 'Unknown ingredient', correctedFrom: null as string | null, flagged: true }
  if (MASTER_INGREDIENTS.includes(normalized as (typeof MASTER_INGREDIENTS)[number])) {
    return { finalName: normalized, correctedFrom: null as string | null, flagged: false }
  }

  let best: string = MASTER_INGREDIENTS[0]
  let bestDistance = Number.POSITIVE_INFINITY
  for (const candidate of MASTER_INGREDIENTS) {
    const dist = levenshtein(normalized, candidate)
    if (dist < bestDistance) {
      bestDistance = dist
      best = candidate
    }
  }

  if (bestDistance <= 2) {
    return { finalName: best, correctedFrom: rawName, flagged: false }
  }

  return { finalName: rawName, correctedFrom: null as string | null, flagged: true }
}

export const toTitleCase = (text: string) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
