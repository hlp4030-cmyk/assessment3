import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../context/useAppState.ts'
import { fetchIngredientsByIds, fetchRecipes } from '../lib/backendApi.ts'

type UiIngredientReq = { id: string; qty: number; unit: string }
type UiRecipe = {
  id: string
  name: string
  image: string
  timeMinutes: number
  required: UiIngredientReq[]
  steps: string[]
  matchPct: number
}

const recipeMealType = (name: string): 'breakfast' | 'lunch' | 'dinner' => {
  const n = name.toLowerCase()
  if (n.includes('breakfast') || n.includes('omelette') || n.includes('toast') || n.includes('oats')) return 'breakfast'
  if (n.includes('lunch') || n.includes('salad') || n.includes('bowl') || n.includes('sandwich')) return 'lunch'
  return 'dinner'
}

export function MealSuggestionsPage() {
  const navigate = useNavigate()
  const { setSelectedRecipe, inventory, user } = useAppState()
  const [mealType, setMealType] = useState<'all' | 'breakfast' | 'lunch' | 'dinner'>('all')
  const [prioritiseExpiring, setPrioritiseExpiring] = useState(false)
  const [showEightyPlus, setShowEightyPlus] = useState(false)
  const [recipes, setRecipes] = useState<UiRecipe[]>([])
  const [ingredientNameById, setIngredientNameById] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setLoading(true)
        const remoteRecipes = await fetchRecipes()
        const ingredientIds = Array.from(new Set(remoteRecipes.flatMap((r) => (r.required_ingredients ?? []).map((i) => i.id))))
        const ingredientMap = await fetchIngredientsByIds(ingredientIds)
        const namesById: Record<string, string> = {}
        Object.keys(ingredientMap).forEach((id) => {
          namesById[id] = ingredientMap[id]?.name?.toLowerCase() ?? ''
        })

        const mapped: UiRecipe[] = remoteRecipes.map((r) => {
          const required = (r.required_ingredients ?? []).map((i) => ({ id: i.id, qty: i.qty, unit: i.unit }))
          const ownedCount = required.filter((req) => {
            return inventory.some((inv) => {
              const ingName = namesById[req.id] ?? ''
              return ingName.length > 0 && inv.name.toLowerCase() === ingName
            })
          }).length
          const matchPct = required.length > 0 ? Math.round((ownedCount / required.length) * 100) : 0

          return {
            id: r.recipe_id,
            name: r.title,
            image: r.image_url,
            timeMinutes: r.cooking_time_mins,
            required,
            steps: (r.instructions ?? '').split(' | ').filter(Boolean),
            matchPct,
          }
        })

        mapped.sort((a, b) => b.matchPct - a.matchPct)
        if (active) {
          setRecipes(mapped)
          setIngredientNameById(namesById)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [inventory])

  const filtered = useMemo(() => {
    const typed = mealType === 'all' ? recipes : recipes.filter((r) => recipeMealType(r.name) === mealType)
    const fullMatch = typed.filter((r) => r.matchPct >= 100)
    const eightyPlus = typed.filter((r) => r.matchPct >= 80 && r.matchPct < 100)
    let base = fullMatch
    if (fullMatch.length === 0) {
      base = eightyPlus
    } else if (showEightyPlus) {
      base = [...fullMatch, ...eightyPlus]
    }

    if (!prioritiseExpiring) return base

    const redUrgentNames = new Set(
      inventory
        .filter((item) => {
          const diff = Math.ceil((new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          return diff <= 3
        })
        .map((x) => x.name.toLowerCase()),
    )

    return base.filter((r) => r.required.some((req) => {
      const name = ingredientNameById[req.id] ?? ''
      return name.length > 0 && redUrgentNames.has(name)
    }))
  }, [recipes, mealType, prioritiseExpiring, inventory, ingredientNameById, showEightyPlus])

  const typedForMessage = useMemo(() => (mealType === 'all' ? recipes : recipes.filter((r) => recipeMealType(r.name) === mealType)), [recipes, mealType])
  const hasFullMatch = typedForMessage.some((r) => r.matchPct >= 100)

  const displayName = (name: string) => name.replace(/^Breakfast\s+|^Lunch\s+|^Dinner\s+/i, '')

  return (
    <section className="space-y-6">
      <div className="glass-card p-8">
        <h1 className="hero-title text-5xl font-semibold">Hi {user.nickname || 'there'}, let's cook something delicious!</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select className="rounded-xl border border-slate-300 bg-white px-3 py-2" value={mealType} onChange={(e) => setMealType(e.target.value as typeof mealType)}>
            <option value="all">All</option><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option>
          </select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={prioritiseExpiring} onChange={(e) => setPrioritiseExpiring(e.target.checked)} /> Prioritise Expiring Ingredients</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showEightyPlus} onChange={(e) => setShowEightyPlus(e.target.checked)} /> Match 80% or higher</label>
        </div>
      </div>
      {!loading && !hasFullMatch && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          There are no dishes you can make right now. I will show you recipes you can make with just a few more ingredients.
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {!loading && filtered.map((recipe) => (
          <article key={recipe.id} className="glass-card overflow-hidden">
            <img src={`${recipe.image}?auto=format&fit=crop&w=1000&q=80`} alt={recipe.name} className="h-40 w-full object-cover" />
            <div className="p-6">
              <h2 className="text-2xl font-semibold">{displayName(recipe.name)}</h2>
              <p className="mt-1 text-slate-600">{recipe.timeMinutes} minutes • Optimised matching</p>
              <p className="mt-1 text-slate-600">Match Percentage: {recipe.matchPct}%</p>
              <button className="mt-4 rounded-full bg-emerald-600 px-5 py-2 text-white" onClick={() => { setSelectedRecipe(recipe as never); navigate('/cooking-guide') }}>Start cooking</button>
            </div>
          </article>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="col-span-full space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4">
            <p className="text-slate-700">No close-match recipes yet.</p>
          </div>
        )}
      </div>
    </section>
  )
}
