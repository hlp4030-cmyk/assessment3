import { useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useAppState } from '../context/useAppState.ts'
import { cookRecipe, fetchIngredients, getMyProfile } from '../lib/backendApi.ts'
import type { CookItemPayload } from '../lib/backendApi.ts'
import type { DbIngredient } from '../types/models.ts'
import { recommendExpiryDate } from '../domain/expiry/recommendExpiryDate.ts'
import { formatCurrencyAU } from '../utils/formatters.ts'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { SectionContainer } from '../components/ui/SectionContainer.tsx'
import { ProgressBar } from '../components/ui/ProgressBar.tsx'

const UNIT_OPTIONS = ['ea', 'g', 'ml'] as const
const stepByUnit = (unit: string) => {
  const u = unit.toLowerCase()
  if (u === 'ea') return 1
  if (u === 'g') return 10
  if (u === 'ml') return 10
  // Legacy fallback for existing Supabase data
  if (u === 'pcs') return 1
  if (u === 'kg') return 10
  if (u === 'l') return 10
  return 1
}

export function ConsumptionResultPage() {
  const { selectedRecipe, inventory, setInventory, goals, setGoals, authSession } = useAppState()
  const navigate = useNavigate()
  const today = new Date().toISOString().slice(0, 10)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [usedItems, setUsedItems] = useState(() =>
    (selectedRecipe?.required ?? []).map((req) => ({
      name: req.name || 'Unknown',
      quantity: req.quantity || 0,
      unit: req.unit || 'ea',
      purchaseDate: today,
      expiryDate: recommendExpiryDate(req.name || '', today),
    })),
  )

  // DB ingredient data for dynamic pricing/CO2
  const [dbIngredients, setDbIngredients] = useState<DbIngredient[]>([])
  const [ingredientsLoaded, setIngredientsLoaded] = useState(false)

  // Real baseline from DB (fetched on mount) — initialized to 0 so first-meal displays start from zero
  const [realBaseline, setRealBaseline] = useState<{ cooking: number; savings: number; co2e: number }>({ cooking: 0, savings: 0, co2e: 0 })

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await fetchIngredients()
        setDbIngredients(rows)
      } catch {
        // Non-blocking
      }
      setIngredientsLoaded(true)
    }
    void load()
  }, [])

  // Fetch real profile goal values as the true "before" baseline
  useEffect(() => {
    const load = async () => {
      if (!authSession?.accessToken) return
      try {
        const profile = await getMyProfile(authSession.accessToken)
        setRealBaseline({
          cooking: profile.goal_cooking ?? 0,
          savings: profile.goal_savings ?? 0,
          co2e: profile.goal_co2e ?? 0,
        })
      } catch {
        // Non-blocking: fall back to local state if fetch fails
      }
    }
    void load()
  }, [authSession?.accessToken])

  // Build ingredient lookup map (name -> DB data)
  const ingredientLookup = useMemo(() => {
    const map: Record<string, DbIngredient> = {}
    for (const ing of dbIngredients) {
      map[ing.name.toLowerCase()] = ing
    }
    return map
  }, [dbIngredients])

  // All hooks MUST be called before any early returns (React rules of hooks)
  const requiredWithAdjustments = useMemo(
    () => usedItems.map(({ name, quantity, unit }) => ({ name, quantity: Math.max(0, quantity), unit })),
    [usedItems],
  )

  // Always use real DB baseline — no fallback to potentially stale local state
  const currentMeals = realBaseline.cooking
  const currentSavings = realBaseline.savings
  const currentCo2e = realBaseline.co2e

  // Dynamic delta calculation using DB approx_price and co2_index
  const { deltaSavings, deltaCo2e } = useMemo(() => {
    let totalSavings = 0
    let totalCo2 = 0
    let hasAnyPrice = false
    let hasAnyCo2 = false

    for (const item of requiredWithAdjustments) {
      const db = ingredientLookup[item.name.toLowerCase()]
      if (db) {
        if (db.approx_price != null) {
          totalSavings += item.quantity * db.approx_price
          hasAnyPrice = true
        }
        if (db.co2_index != null) {
          totalCo2 += item.quantity * db.co2_index
          hasAnyCo2 = true
        }
      }
    }

    return {
      // Fallback to placeholder if no DB price data available
      deltaSavings: hasAnyPrice ? totalSavings : Math.max(6, requiredWithAdjustments.length * 2),
      deltaCo2e: hasAnyCo2 ? Number(totalCo2.toFixed(2)) : Math.max(0.12, Number((requiredWithAdjustments.length * 0.08).toFixed(2))),
    }
  }, [requiredWithAdjustments, ingredientLookup])

  // Progress bar uses projected values
  const cookingProgress = Math.min(100, Math.round(((currentMeals + 1) / Math.max(1, goals.weeklyMealsTarget)) * 100))
  const savingsProgress = Math.min(100, Math.round(((currentSavings + deltaSavings) / Math.max(1, goals.monthlySavingsTargetAud)) * 100))
  const environmentProgress = Math.min(100, Math.round(((currentCo2e + deltaCo2e) / 25) * 100))

  // Early return AFTER all hooks
  if (!selectedRecipe) {
    return (
      <SectionContainer>
        <Card>
          <h1 className="text-4xl font-semibold">Consumption Result</h1>
          <p className="mt-3 text-slate-600">No completed dish found. Please select a recipe and complete cooking first.</p>
          <div className="mt-4">
            <Button onClick={() => navigate('/meal-suggestions')}>Browse Recipes</Button>
          </div>
        </Card>
      </SectionContainer>
    )
  }

  const applyResult = async () => {
    if (isSubmitting) return
    if (!authSession?.accessToken) {
      setError('Your session has expired. Please log in again.')
      return
    }

    // Build the cook payload by matching required items to inventory rows
    const cookItems: CookItemPayload[] = []
    for (const req of requiredWithAdjustments) {
      const match = inventory.find(
        (inv) => inv.name.toLowerCase() === req.name.toLowerCase() && inv.unit.toLowerCase() === req.unit.toLowerCase(),
      )
      if (match) {
        cookItems.push({ item_id: match.id, quantity_used: req.quantity })
      }
    }

    const previousInventory = inventory
    const previousGoals = goals

    try {
      setIsSubmitting(true)
      setError('')

      const result = await cookRecipe(authSession.accessToken, {
        recipe_name: selectedRecipe.name,
        items: cookItems,
      })

      // Remove fully-consumed items from local inventory, update partially-consumed ones
      setInventory((prev) =>
        prev
          .filter((item) => !result.used_item_ids.includes(item.id))
          .map((item) => {
            const updated = result.updated_items.find((u) => u.id === item.id)
            return updated
              ? { ...item, quantity: updated.quantity, expiryDate: updated.expiry_date }
              : item
          }),
      )

      // Sync goals from backend response (source of truth)
      setGoals((prev) => ({
        ...prev,
        mealsCookedThisWeek: (result.profile.goal_cooking ?? prev.mealsCookedThisWeek),
        savingsThisMonthAud: (result.profile.goal_savings ?? prev.savingsThisMonthAud),
        wasteReductionAchievedPercent: (result.profile.goal_co2e ?? prev.wasteReductionAchievedPercent),
      }))

      navigate('/updated-dashboard')
    } catch (err) {
      // Rollback local state on failure
      setInventory(previousInventory)
      setGoals(previousGoals)
      setError(err instanceof Error ? err.message : 'Failed to sync recipe result to database.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SectionContainer><Card>
      <h1 className="text-4xl font-semibold">Consumption Result</h1>
      <p className="mt-3 text-slate-600">Dish completed: {selectedRecipe.name}</p>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      <div className="mt-4 space-y-2">
        {usedItems.map((req, idx) => (
          <div key={`${req.name}-${idx}`} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-5 md:items-center">
            <input className="rounded-2xl border border-slate-200 px-3 py-2 transition-colors duration-150" value={req.name} onChange={(e) => setUsedItems((prev) => prev.map((x, i) => i === idx ? { ...x, name: e.target.value, expiryDate: recommendExpiryDate(e.target.value, x.purchaseDate) } : x))} />
            <input type="number" min={0} step={stepByUnit(req.unit)} className="rounded-2xl border border-slate-200 px-3 py-2 transition-colors duration-150" value={req.quantity} onChange={(e) => setUsedItems((prev) => prev.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value) || 0 } : x))} />
            <select className="rounded-2xl border border-slate-200 px-3 py-2 transition-colors duration-150" value={req.unit} onChange={(e) => setUsedItems((prev) => prev.map((x, i) => i === idx ? { ...x, unit: e.target.value } : x))}>
              {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <div className="flex gap-2">
              <button className="rounded-full border px-3" onClick={() => setUsedItems((prev) => prev.map((x, i) => i === idx ? { ...x, quantity: Math.max(0, x.quantity - stepByUnit(x.unit)) } : x))}>-</button>
              <button className="rounded-full border px-3" onClick={() => setUsedItems((prev) => prev.map((x, i) => i === idx ? { ...x, quantity: x.quantity + stepByUnit(x.unit) } : x))}>+</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Cooking goal impact</p>
          <p className="mt-1 text-sm">{currentMeals} → {currentMeals + 1} / {goals.weeklyMealsTarget}</p>
          <ProgressBar value={cookingProgress} />
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Savings impact</p>
          <p className="mt-1 text-sm">{formatCurrencyAU(currentSavings)} → {formatCurrencyAU(currentSavings + deltaSavings)}</p>
          <ProgressBar value={savingsProgress} />
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Carbon emission reduced</p>
          <p className="mt-1 text-sm">{currentCo2e.toFixed(2)} → {(currentCo2e + deltaCo2e).toFixed(2)} kg CO2e</p>
          <ProgressBar value={environmentProgress} />
        </Card>
      </div>
      <div className="mt-8"><Button onClick={applyResult} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Confirm and update goals'}</Button></div>
    </Card></SectionContainer>
  )
}