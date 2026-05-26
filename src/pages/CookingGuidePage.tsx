import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../context/useAppState.ts'
import { Button } from '../components/ui/Button.tsx'
import { fetchIngredientsByIds } from '../lib/backendApi.ts'

type RecipeReq = { id?: string; name?: string; qty?: number; quantity?: number; unit?: string }

export function CookingGuidePage() {
  const { selectedRecipe } = useAppState()
  const navigate = useNavigate()
  const [done, setDone] = useState<boolean[]>([])
  const [ingredientNamesById, setIngredientNamesById] = useState<Record<string, string>>({})

  const steps = useMemo(() => {
    if (!selectedRecipe) return []
    if (Array.isArray(selectedRecipe.steps) && selectedRecipe.steps.length > 0) return selectedRecipe.steps
    return (selectedRecipe.instructions ?? '').split(' | ').filter(Boolean)
  }, [selectedRecipe])

  const requiredItems = useMemo<RecipeReq[]>(() => {
    if (!selectedRecipe) return []
    if (Array.isArray(selectedRecipe.required_ingredients) && selectedRecipe.required_ingredients.length > 0) {
      return selectedRecipe.required_ingredients.map((r) => ({ id: r.id, qty: r.qty, unit: r.unit }))
    }
    return (selectedRecipe.required ?? []).map((r) => ({ name: r.name, quantity: r.quantity, unit: r.unit }))
  }, [selectedRecipe])

  useEffect(() => {
    let active = true
    const loadIngredientNames = async () => {
      const ids = requiredItems.map((r) => r.id).filter((x): x is string => Boolean(x))
      if (ids.length === 0) return
      const map = await fetchIngredientsByIds(ids)
      if (!active) return
      const names: Record<string, string> = {}
      ids.forEach((id) => {
        names[id] = map[id]?.name ?? id
      })
      setIngredientNamesById(names)
    }
    void loadIngredientNames()
    return () => {
      active = false
    }
  }, [requiredItems])

  const allChecked = steps.length > 0 ? done.filter(Boolean).length === steps.length : false
  const selectAll = () => {
    setDone(steps.map(() => true))
  }

  if (!selectedRecipe) {
    return (
      <section className="rounded-3xl bg-white p-8 shadow-sm">
        <p>No recipe selected yet.</p>
      </section>
    )
  }

  return (
    <section className="glass-card p-8">
      <h1 className="hero-title text-5xl font-semibold">Cooking Guide</h1>
      <h2 className="mt-2 text-2xl font-semibold text-emerald-700">{selectedRecipe.title ?? selectedRecipe.name}</h2>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Required ingredients</p>
        <ul className="mt-2 space-y-1 text-slate-700">
          {requiredItems.map((req, idx) => {
            const qty = req.qty ?? req.quantity ?? 1
            const unit = req.unit ?? ''
            const label = req.name ?? (req.id ? (ingredientNamesById[req.id] ?? req.id) : 'Ingredient')
            return <li key={`${label}-${idx}`}>{qty} {unit} {label}</li>
          })}
        </ul>
      </div>
      <p className="mt-2 text-slate-600">Progress: {done.filter(Boolean).length}/{steps.length} steps complete</p>
      {!allChecked && (
        <button
          className="mt-3 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
          onClick={selectAll}
        >
          Select All Steps
        </button>
      )}
      <ol className="mt-6 space-y-3">
        {steps.map((step, idx) => (
          <li key={`${step}-${idx}`} className="flex items-center gap-3 rounded-2xl border border-emerald-100 p-4">
            <input
              type="checkbox"
              checked={done[idx] ?? false}
              onChange={(e) => setDone((prev) => {
                const next = [...prev]
                next[idx] = e.target.checked
                return next
              })}
            />
            <span className={`font-semibold ${done[idx] ? 'line-through text-slate-400' : ''}`}>Step {idx + 1}:</span>
            <span className={done[idx] ? 'line-through text-slate-400' : ''}>{step}</span>
          </li>
        ))}
      </ol>
      <div className="mt-8">
        <Button disabled={!allChecked} onClick={() => navigate('/consumption-result')}>
          Complete Cooking
        </Button>
      </div>
    </section>
  )
}
