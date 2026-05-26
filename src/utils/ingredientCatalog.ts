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
