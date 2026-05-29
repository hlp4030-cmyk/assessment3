import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../context/useAppState.ts'
import type { DbRecipe, Recipe } from '../types/models.ts'
import { fetchRecipes } from '../lib/backendApi.ts'
import { hasEnoughWithUnitConversion } from '../domain/rewards/rewardEngine.ts'
import { getRecipeImageUrl } from '../utils/ingredientImages.ts'

/** Convert a DbRecipe to the legacy Recipe shape used by CookingGuidePage */
const toLegacyRecipe = (r: DbRecipe): Recipe => ({
  id: r.recipe_id,
  name: r.title,
  image: r.image_url ?? '',
  timeMinutes: r.cooking_time_mins,
  required: r.required_ingredients.map((ri) => ({ name: ri.name, quantity: ri.quantity, unit: ri.unit })),
  steps: r.steps,
})

export function MealSuggestionsPage() {
  const navigate = useNavigate()
  const { setSelectedRecipe, inventory, user } = useAppState()
  const [mealType, setMealType] = useState<'all' | 'breakfast' | 'lunch' | 'dinner'>('all')
  const [prioritizeExpiring, setPrioritizeExpiring] = useState(false)

  // DB-driven recipes
  const [dbRecipes, setDbRecipes] = useState<DbRecipe[]>([])
  const [recipesLoaded, setRecipesLoaded] = useState(false)
  const [recipesError, setRecipesError] = useState('')

  // Fetch recipes from DB on mount
  useEffect(() => {
    const load = async () => {
      try {
        const rows = await fetchRecipes()
        setDbRecipes(rows)
        setRecipesError('')
      } catch {
        setRecipesError('Failed to load recipes. Please refresh.')
      }
      setRecipesLoaded(true)
    }
    void load()
  }, [])

  const missingIngredients = (recipe: DbRecipe) => recipe.required_ingredients.filter((req) => {
    const item = inventory.find((x) => x.name.toLowerCase() === req.name.toLowerCase())
    return !item || !hasEnoughWithUnitConversion(item, req.quantity, req.unit)
  })

  const canMake = (recipe: DbRecipe) => missingIngredients(recipe).length === 0
  const missingCount = (recipe: DbRecipe) => missingIngredients(recipe).length

  const redUrgentNames = new Set(
    inventory
      .filter((item) => {
        const diff = Math.ceil((new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        return diff <= 3
      })
      .map((x) => x.name.toLowerCase()),
  )

  const filtered = useMemo(() => {
    const base = dbRecipes.filter(canMake)
    const typed = mealType === 'all' ? base : base.filter((r) => r.meal_type === mealType)
    if (!prioritizeExpiring) return typed
    const urgentOnly = typed.filter((r) => r.required_ingredients.some((req) => redUrgentNames.has(req.name.toLowerCase())))
    return [...urgentOnly].sort((a, b) => a.required_ingredients.length - b.required_ingredients.length)
  }, [inventory, mealType, prioritizeExpiring, dbRecipes])

  const fallbackRecipes = useMemo(() => {
    const close = dbRecipes.filter((r) => {
      const missing = missingCount(r)
      return missing >= 1 && missing <= 2
    }).sort((a, b) => missingCount(a) - missingCount(b))
    return mealType === 'all' ? close : close.filter((r) => r.meal_type === mealType)
  }, [inventory, mealType, dbRecipes])

  const displayName = (title: string) => title.replace(/^Breakfast\s+|^Lunch\s+|^Dinner\s+/i, '')

  // Loading state
  if (!recipesLoaded) {
    return (
      <section className="space-y-6">
        <div className="glass-card p-8">
          <h1 className="hero-title text-5xl font-semibold">Hi {user.nickname || 'there'}, let's cook something delicious!</h1>
          <p className="mt-4 text-slate-500">Loading recipes...</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card overflow-hidden">
              <div className="h-40 w-full animate-pulse bg-slate-200" />
              <div className="p-6 space-y-3">
                <div className="h-6 w-3/4 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
                <div className="h-8 w-24 animate-pulse rounded-full bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  // Error state
  if (recipesError) {
    return (
      <section className="space-y-6">
        <div className="glass-card p-8">
          <h1 className="hero-title text-5xl font-semibold">Hi {user.nickname || 'there'}, let's cook something delicious!</h1>
          <p className="mt-4 text-sm text-rose-600">{recipesError}</p>
          <button onClick={() => window.location.reload()} className="mt-3 rounded-full bg-emerald-600 px-5 py-2 text-white">Retry</button>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="glass-card p-8">
        <h1 className="hero-title text-5xl font-semibold">Hi {user.nickname || 'there'}, let's cook something delicious!</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select className="rounded-xl border border-slate-300 bg-white px-3 py-2" value={mealType} onChange={(e) => setMealType(e.target.value as typeof mealType)}>
            <option value="all">All</option><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option>
          </select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={prioritizeExpiring} onChange={(e) => setPrioritizeExpiring(e.target.checked)} /> Prioritise Expiring Ingredients</label>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((recipe) => (
          <article key={recipe.recipe_id} className="glass-card overflow-hidden">
            <div className="relative h-40 w-full bg-slate-100">
              <img
                src={getRecipeImageUrl(recipe.title, recipe.image_url)}
                alt={recipe.title}
                className="h-full w-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget
                  target.onerror = null
                  target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
                }}
              />
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-semibold">{displayName(recipe.title)}</h2>
              {recipe.description && <p className="mt-1 text-sm text-slate-500 line-clamp-2">{recipe.description}</p>}
              <p className="mt-1 text-slate-600">{recipe.cooking_time_mins} minutes • Low-waste recommendation</p>
              <button className="mt-4 rounded-full bg-emerald-600 px-5 py-2 text-white" onClick={() => { setSelectedRecipe(toLegacyRecipe(recipe)); navigate('/cooking-guide') }}>Start cooking</button>
            </div>
          </article>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4">
            <p className="text-slate-700">Here are recipes you can make with just a few extra ingredients.</p>
            <div className="grid gap-3 md:grid-cols-2">
              {fallbackRecipes.map((recipe) => (
                <div key={recipe.recipe_id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="font-semibold">{displayName(recipe.title)}</p>
                  <p className="text-sm text-slate-600">Missing: {missingIngredients(recipe).map((m) => `${m.quantity}${m.unit} ${m.name}`).join(', ')}</p>
                </div>
              ))}
              {fallbackRecipes.length === 0 && <p className="text-slate-600">No close-match recipes yet.</p>}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}