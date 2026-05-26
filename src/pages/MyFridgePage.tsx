import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAppState } from '../context/useAppState.ts'
import { deleteMyFridgeItem, getMyFridgeItems, markItemWasted, updateMyFridgeItem } from '../lib/backendApi.ts'
import { formatDateAU } from '../utils/formatters.ts'
import { ingredientImageUrl } from '../utils/ingredientAssets.ts'
import { groupByName } from '../utils/fridgeGrouping.ts'
import type { FridgeGroup } from '../utils/fridgeGrouping.ts'
import type { Ingredient } from '../types/models.ts'

export function MyFridgePage() {
  const { inventory, setInventory, user, goals, setGoals, authSession } = useAppState()
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [originalSnapshot, setOriginalSnapshot] = useState<Record<string, Ingredient>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryTab, setCategoryTab] = useState<'all' | 'veg' | 'meat' | 'dairy' | 'others'>('all')
  const [error, setError] = useState('')
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
  const daysLeft = (expiryDate: string) => Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  const getBadge = (expiryDate: string) => {
    const diff = daysLeft(expiryDate)
    if (diff <= 3) return 'bg-rose-500 text-white'
    if (diff <= 7) return 'bg-amber-400 text-slate-900'
    return 'bg-emerald-500 text-white'
  }

  const tabMatch = (name: string) => {
    const n = name.toLowerCase()
    if (categoryTab === 'all') return true
    if (categoryTab === 'veg') return ['spinach', 'tomato', 'broccoli', 'carrot', 'onion', 'capsicum', 'zucchini', 'cucumber', 'lettuce', 'cauliflower', 'eggplant', 'mushroom', 'corn', 'peas', 'beans', 'chickpeas', 'potato', 'sweet potato'].some((x) => n.includes(x))
    if (categoryTab === 'meat') return ['chicken', 'beef', 'pork', 'fish', 'shrimp', 'tofu'].some((x) => n.includes(x))
    if (categoryTab === 'dairy') return ['milk', 'yogurt', 'cheese', 'butter', 'egg'].some((x) => n.includes(x))
    return true
  }

  // Build groups from inventory, then apply search + category filter
  const filteredGroups: FridgeGroup[] = groupByName(inventory)
    .filter((group) => group.name.toLowerCase().includes(search.toLowerCase()))
    .filter((group) => tabMatch(group.name))

  useEffect(() => {
    const run = async () => {
      if (!authSession?.accessToken) return
      try {
        const rows = await getMyFridgeItems(authSession.accessToken)
        const mapped: Ingredient[] = rows.map((row) => ({
          id: row.id,
          name: row.ingredient,
          icon: '🥗',
          quantity: row.quantity,
          unit: row.unit,
          category: row.category ?? 'General',
          purchaseDate: row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
          expiryDate: row.expiry_date,
          source: 'quick-add',
        }))
        setInventory(mapped)
      } catch {
        // Non-blocking: keep local state if load fails.
      }
    }
    void run()
  }, [authSession?.accessToken, setInventory])

  const patchItem = async (id: string, patch: { quantity?: number; expiry_date?: string }) => {
    if (!authSession?.accessToken) {
      setError('Please log in again to sync fridge updates.')
      return
    }
    try {
      setError('')
      const updated = await updateMyFridgeItem(authSession.accessToken, id, patch)
      setInventory((prev) => prev.map((x) => (x.id === id
        ? {
            ...x,
            quantity: updated.quantity,
            unit: updated.unit,
            expiryDate: updated.expiry_date,
            name: updated.ingredient,
            category: updated.category ?? x.category,
          }
        : x)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update fridge item.')
    }
  }

  const removeItem = async (id: string, onSuccess?: () => void) => {
    if (!authSession?.accessToken) {
      setError('Please log in again to sync fridge updates.')
      return
    }
    try {
      setError('')
      await deleteMyFridgeItem(authSession.accessToken, id)
      setInventory((prev) => prev.filter((x) => x.id !== id))
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete fridge item.')
    }
  }

  const discardItem = async (id: string) => {
    const confirmed = window.confirm('This item will be permanently deleted and your goal progress will be penalised. Are you sure you want to discard this?')
    if (!confirmed) return
    if (!authSession?.accessToken) {
      setError('Please log in again to sync fridge updates.')
      return
    }

    const previousGoals = goals
    const previousInventory = inventory

    try {
      setLoadingId(id)
      setError('')
      const result = await markItemWasted(authSession.accessToken, id)

      // Remove wasted item from local inventory (it no longer has status 'in_fridge')
      setInventory((prev) => prev.filter((x) => x.id !== id))

      // Sync penalised goals from backend response (source of truth)
      setGoals((prev) => ({
        ...prev,
        savingsThisMonthAud: (result.profile.goal_savings ?? prev.savingsThisMonthAud),
        wasteReductionAchievedPercent: (result.profile.goal_co2e ?? prev.wasteReductionAchievedPercent),
      }))
    } catch (err) {
      // Rollback on failure
      setInventory(previousInventory)
      setGoals(previousGoals)
      setError(err instanceof Error ? err.message : 'Failed to mark item as wasted.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <section className="space-y-6">
      <div className="glass-card p-8">
        <h1 className="hero-title text-5xl font-semibold">{user.nickname || 'My'}'s Fridge</h1>
        <p className="mt-2 text-slate-600">Track what's fresh and what needs using soon.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input className="rounded-2xl border border-slate-200 bg-white px-4 py-3 transition-colors duration-150" placeholder="Search ingredients..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {(['all', 'veg', 'meat', 'dairy', 'others'] as const).map((tab) => (
              <button key={tab} className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${categoryTab === tab ? 'border-emerald-500 bg-emerald-100 text-emerald-800 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'}`} onClick={() => setCategoryTab(tab)}>{tab === 'all' ? 'All' : tab === 'veg' ? 'Veg' : tab === 'meat' ? 'Meat' : tab === 'dairy' ? 'Dairy' : 'Others'}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {error && <p className="text-sm text-rose-600 col-span-full">{error}</p>}
        {filteredGroups.map((group) => {
          const earliest = group.rows[0]
          const dl = daysLeft(group.earliestExpiryDate)
          const badge = getBadge(group.earliestExpiryDate)
          const isExpired = dl < 0
          const batchCount = group.rows.length

          return (
            <article
              key={group.name}
              className={`overflow-hidden rounded-3xl border shadow-sm ${isExpired ? 'border-slate-400 bg-slate-300 text-slate-900' : 'glass-card'}`}
            >
              <img src={ingredientImageUrl(group.name)} alt={group.name} className="h-36 w-full object-cover" onError={(e) => { e.currentTarget.src = ingredientImageUrl('fallback') }} />
              <div className={`p-5 ${isExpired ? 'text-slate-900' : ''}`}>
                <div className="flex items-center justify-between">
                  <h2 className="mt-2 text-xl font-semibold">{group.name}</h2>
                  {batchCount > 1 && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{batchCount} batches</span>
                  )}
                </div>
                <button className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge}`}>
                  Earliest Expiry: {formatDateAU(group.earliestExpiryDate)} ({dl < 0 ? `${Math.abs(dl)}d overdue` : `${dl}d left`})
                </button>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {editingGroup === group.name ? (
                    <>
                      <input type="number" step={stepByUnit(group.unit)} value={earliest.quantity} onChange={(e) => {
                        const nextQty = Math.max(0, Number(e.target.value) || 0)
                        setInventory((prev) => prev.map((x) => x.id === earliest.id ? { ...x, quantity: nextQty } : x))
                      }} className="w-24 rounded-2xl border border-slate-200 p-3 transition-colors duration-150" />
                      <input type="date" value={earliest.expiryDate} onChange={(e) => {
                        const nextDate = e.target.value
                        setInventory((prev) => prev.map((x) => x.id === earliest.id ? { ...x, expiryDate: nextDate } : x))
                      }} className="rounded-2xl border border-slate-200 p-3 transition-colors duration-150" />
                      <button
                        className={`rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700 ${loadingId === group.name ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={loadingId === group.name}
                        onClick={() => {
                          const confirmed = window.confirm('This item will be permanently deleted. Are you sure you want to continue?')
                          if (!confirmed) return
                          void removeItem(earliest.id)
                        }}
                      >
                        {loadingId === group.name ? 'Deleting...' : 'Delete'}
                      </button>
                      <button
                        className={`rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-700 ${loadingId === group.name ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={loadingId === group.name}
                        onClick={async () => {
                          const edited = inventory.find((x) => x.id === earliest.id)
                          if (!edited || !authSession?.accessToken) return
                          setLoadingId(group.name)
                          setError('')
                          try {
                            await patchItem(earliest.id, { quantity: edited.quantity, expiry_date: edited.expiryDate })
                          } catch {
                            // patchItem already sets error
                          } finally {
                            setLoadingId(null)
                            setEditingGroup(null)
                            setOriginalSnapshot((prev) => { const next = { ...prev }; delete next[group.name]; return next })
                          }
                        }}
                      >
                        {loadingId === group.name ? 'Saving...' : 'Done'}
                      </button>
                      <button
                        className="rounded-full border border-slate-300 bg-white px-3 py-1 text-slate-600 hover:bg-slate-50"
                        onClick={() => {
                          const snapshot = originalSnapshot[group.name]
                          if (snapshot) {
                            setInventory((prev) => prev.map((x) => x.id === snapshot.id ? { ...snapshot } : x))
                          }
                          setEditingGroup(null)
                          setOriginalSnapshot((prev) => { const next = { ...prev }; delete next[group.name]; return next })
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className={`rounded-full border border-emerald-200 bg-white px-3 py-1 ${loadingId === group.name ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={loadingId === group.name}
                        onClick={() => {
                          // Decrement earliest row; if it reaches 0, remove that row entirely
                          const step = stepByUnit(earliest.unit)
                          const nextQty = Math.max(0, earliest.quantity - step)
                          if (nextQty === 0) {
                            void removeItem(earliest.id)
                          } else {
                            setInventory((prev) => prev.map((x) => x.id === earliest.id ? { ...x, quantity: nextQty } : x))
                            void patchItem(earliest.id, { quantity: nextQty })
                          }
                        }}
                      >-</button>
                      <p>{group.totalQuantity} {group.unit}</p>
                      <button
                        className={`rounded-full border border-emerald-200 bg-white px-3 py-1 ${loadingId === group.name ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={loadingId === group.name}
                        onClick={() => {
                          const nextQty = earliest.quantity + stepByUnit(earliest.unit)
                          setInventory((prev) => prev.map((x) => x.id === earliest.id ? { ...x, quantity: nextQty } : x))
                          void patchItem(earliest.id, { quantity: nextQty })
                        }}
                      >+</button>
                      <button
                        className="rounded-full border border-slate-300 bg-white px-3 py-1"
                        onClick={() => {
                          setOriginalSnapshot((prev) => ({ ...prev, [group.name]: { ...earliest } }))
                          setEditingGroup(group.name)
                        }}
                      >Edit</button>
                      {isExpired && (
                        <button
                          className={`rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-rose-700 ${loadingId === group.name ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={loadingId === group.name}
                          onClick={() => { void discardItem(earliest.id) }}
                        >{loadingId === group.name ? 'Processing...' : 'Unused Waste'}</button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </article>
          )
        })}
        {filteredGroups.length === 0 && inventory.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 px-8 py-16 text-center">
            <span className="text-6xl mb-4">🍽️</span>
            <h2 className="text-2xl font-semibold text-slate-800">Your fridge is empty!</h2>
            <p className="mt-2 max-w-md text-slate-500">Let's add some ingredients to get started. You can paste a shopping list or search for individual items.</p>
            <Link to="/ingredient-input" className="mt-6 rounded-full bg-emerald-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-emerald-700">
              Add ingredients
            </Link>
          </div>
        )}
        {filteredGroups.length === 0 && inventory.length > 0 && (
          <p className="col-span-full text-center text-slate-500">No ingredients match your search.</p>
        )}
      </div>
      <div className="flex gap-3">
        <Link to="/ingredient-input" className="rounded-full bg-emerald-600 px-5 py-3 text-white">Add ingredients</Link>
        <Link to="/meal-suggestions" className="rounded-full bg-slate-900 px-5 py-3 text-white">See meal suggestions</Link>
      </div>
    </section>
  )
}