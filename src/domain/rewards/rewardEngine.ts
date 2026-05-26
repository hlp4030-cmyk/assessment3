import type { GoalState, Ingredient, Recipe, RewardState } from '../../types/models.ts'

const toBase = (qty: number, unit: string) => {
  const u = unit.toLowerCase()
  if (u === 'kg') return { kind: 'mass' as const, value: qty * 1000 }
  if (u === 'g') return { kind: 'mass' as const, value: qty }
  if (u === 'l') return { kind: 'volume' as const, value: qty * 1000 }
  if (u === 'ml') return { kind: 'volume' as const, value: qty }
  // 'ea', 'pcs', 'pack' and any other count-based unit
  return { kind: 'count' as const, value: qty }
}

export const hasEnoughWithUnitConversion = (available: Ingredient, requiredQty: number, requiredUnit: string) => {
  const a = toBase(available.quantity, available.unit)
  const r = toBase(requiredQty, requiredUnit)
  if (a.kind !== r.kind) return false
  return a.value >= r.value
}

export const deductIngredientsForRecipe = (inventory: Ingredient[], recipe: Recipe): Ingredient[] => {
  const next = [...inventory]
  recipe.required.forEach((req) => {
    // Find all matching rows (same name + unit) and sort by earliest expiry (FIFO)
    const matches = next
      .filter((item) => item.name.toLowerCase() === req.name.toLowerCase() && item.unit.toLowerCase() === req.unit.toLowerCase())
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())

    let remaining = req.quantity
    for (const match of matches) {
      if (remaining <= 0) break
      const deduction = Math.min(remaining, match.quantity)
      match.quantity = Math.max(0, match.quantity - deduction)
      remaining -= deduction
    }
  })
  return next.filter((item) => item.quantity > 0)
}

export const mergeIngredients = (current: Ingredient[], incoming: Ingredient[]): Ingredient[] => {
  const merged = [...current]
  incoming.forEach((ingredient) => {
    const normalizedName = ingredient.name.trim().toLowerCase()
    const normalizedUnit = ingredient.unit.trim().toLowerCase()
    const existing = merged.find(
      (item) => item.name.trim().toLowerCase() === normalizedName && item.unit.trim().toLowerCase() === normalizedUnit,
    )
    if (existing) {
      existing.quantity += ingredient.quantity
      existing.expiryDate = existing.expiryDate < ingredient.expiryDate ? existing.expiryDate : ingredient.expiryDate
      return
    }
    merged.push({ ...ingredient, name: ingredient.name.trim(), unit: normalizedUnit })
  })
  return merged
}

export const applyMealImpactToGoals = (goals: GoalState, usedIngredientCount: number) => {
  const mealsCooked = goals.mealsCookedThisWeek + 1
  const savingsDelta = Math.max(6, usedIngredientCount * 2)
  // More realistic avoided-waste impact (kg CO2e) per ingredient unit used
  const envDeltaKgCo2e = Math.max(0.12, Number((usedIngredientCount * 0.08).toFixed(2)))

  return {
    ...goals,
    mealsCookedThisWeek: mealsCooked,
    savingsThisMonthAud: goals.savingsThisMonthAud + savingsDelta,
    wasteReductionAchievedPercent: Number((goals.wasteReductionAchievedPercent + envDeltaKgCo2e).toFixed(2)),
  }
}

export const applyDiscardImpactToGoals = (goals: GoalState, discardedCount: number) => {
  const savingsPenalty = Math.max(1, discardedCount * 1.5)
  const carbonPenalty = Math.max(0.08, Number((discardedCount * 0.08).toFixed(2)))
  return {
    ...goals,
    savingsThisMonthAud: Math.max(0, goals.savingsThisMonthAud - savingsPenalty),
    wasteReductionAchievedPercent: Math.max(0, Number((goals.wasteReductionAchievedPercent - carbonPenalty).toFixed(2))),
  }
}

export const applyRewardsForCook = (goals: GoalState, rewards: RewardState) => {
  const mealsCooked = goals.mealsCookedThisWeek + 1
  const savings = goals.savingsThisMonthAud + 14
  const points = rewards.points + 20
  const streak = rewards.streak + 1
  const milestone = points >= 200 ? 'Waste Warrior' : points >= 100 ? 'Eco Cook' : 'Starter'

  return {
    goals: {
      ...goals,
      mealsCookedThisWeek: mealsCooked,
      savingsThisMonthAud: savings,
      wasteReductionAchievedPercent: Math.min(100, goals.wasteReductionAchievedPercent + 4),
    },
    rewards: {
      points,
      streak,
      milestone,
    },
  }
}
