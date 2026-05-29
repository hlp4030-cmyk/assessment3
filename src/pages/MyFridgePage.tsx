import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useAppState } from '../context/useAppState.ts'
import { deleteMyFridgeItem, fetchIngredients, getMyFridgeItems, markItemWasted, updateMyFridgeItem } from '../lib/backendApi.ts'
import { formatDateAU } from '../utils/formatters.ts'
import { getIngredientImageUrl } from '../utils/ingredientImages.ts'
import { groupByName } from '../utils/fridgeGrouping.ts'
import type { FridgeGroup } from '../utils/fridgeGrouping.ts'
import type { Ingredient } from '../types/models.ts'

const CATEGORY_TABS = [
  { key: 'all' as const, label: 'All' },
  { key: 'vegetables' as const, label: '🥦 Vegetables' },
  { key: 'fruits' as const, label: '🍎 Fruits' },
  { key: 'meat' as const, label: '🥩 Meat' },
  { key: 'seafood' as const, label: '🐟 Seafood' },
  { key: 'dairy' as const, label: '🥛 Dairy' },
  { key: 'grains' as const, label: '🌾 Grains' },
]

type CategoryTab = (typeof CATEGORY_TABS)[number]['key']

export function MyFridgePage() {
  const { inventory, setInventory, user, goals, setGoals, authSession } = useAppState()
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [originalSnapshot, setOriginalSnapshot] = useState<Record<string, Ingredient>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryTab, setCategoryTab] = useState<CategoryTab>('all')
  const [error, setError] = useState('')
  const [dbIngredients, setDbIngredients] = useState<Array<{ name: string; image_url?: string | null }>>([])

  // Bulk Edit Mode state
  const [bulkEditMode, setBulkEditMode] = useState(false)
  const [bulkEdits, setBulkEdits] = useState<Record<string, { quantity: number; expiryDate: string }>>({})
  const [bulkSnapshot, setBulkSnapshot] = useState<Ingredient[]>([])
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkDeletedIds, setBulkDeletedIds] = useState<Set<string>>(new Set())

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

  const tabMatch = (group: FridgeGroup) => {
    if (categoryTab === 'all') return true
    const itemCategory = group.rows[0]?.category?.toLowerCase() ?? ''
    return itemCategory === categoryTab
  }

  // Build groups from inventory, then apply search + category filter
  const filteredGroups: FridgeGroup[] = groupByName(inventory)
    .filter((group) => group.name.toLowerCase().includes(search.toLowerCase()))
    .filter((group) => tabMatch(group))

  // Fetch ingredient master data (for image_url) on mount
  const [dbIngredientsLoaded, setDbIngredientsLoaded] = useState(false)
  useEffect(() => {
    const load = async () => {
      try {
        const rows = await fetchIngredients()
        setDbIngredients(rows)
      } catch {
        // Non-blocking: keep existing fallback if load fails.
      } finally {
        setDbIngredientsLoaded(true)
      }
    }
    void load()
  }, [])

  // Build image URL lookup from DB ingredients
  const imageUrlMap = useMemo(() => {
    const map: Record<string, string | null> = {}
    for (const ing of dbIngredients) {
      map[ing.name.toLowerCase()] = ing.image_url ?? null
    }
    return map
  }, [dbIngredients])

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

  // ── Bulk Edit Mode Handlers ──

  const enterBulkEditMode = () => {
    setBulkSnapshot([...inventory])
    const edits: Record<string, { quantity: number; expiryDate: string }> = {}
    for (const item of inventory) {
      edits[item.id] = { quantity: item.quantity, expiryDate: item.expiryDate }
    }
    setBulkEdits(edits)
    setBulkDeletedIds(new Set())
    setBulkEditMode(true)
    setEditingGroup(null) // close any single-edit mode
  }

  const cancelBulkEdit = () => {
    setInventory([...bulkSnapshot])
    setBulkEdits({})
    setBulkSnapshot([])
    setBulkDeletedIds(new Set())
    setBulkEditMode(false)
    setError('')
  }

  const saveBulkEdit = async () => {
    if (!authSession?.accessToken) {
      setError('Please log in again to sync fridge updates.')
      return
    }

    setBulkSaving(true)
    setError('')

    // Collect zero-quantity items for deletion too
    const idsToDelete = new Set(bulkDeletedIds)
    for (const [id, edit] of Object.entries(bulkEdits)) {
      if (edit.quantity <= 0 && !idsToDelete.has(id)) {
        idsToDelete.add(id)
      }
    }

    // Build list of changed items (exclude deleted ones)
    const changes: { id: string; quantity: number; expiryDate: string }[] = []
    for (const item of bulkSnapshot) {
      if (idsToDelete.has(item.id)) continue
      const edit = bulkEdits[item.id]
      if (!edit) continue
      if (edit.quantity !== item.quantity || edit.expiryDate !== item.expiryDate) {
        changes.push({ id: item.id, quantity: edit.quantity, expiryDate: edit.expiryDate })
      }
    }

    try {
      const promises: Promise<unknown>[] = []

      // Delete flagged items in parallel
      for (const id of idsToDelete) {
        promises.push(deleteMyFridgeItem(authSession.accessToken, id))
      }

      // Update changed items in parallel
      const updateResults = changes.length > 0
        ? await Promise.allSettled([
            ...promises,
            ...changes.map((change) =>
              updateMyFridgeItem(authSession.accessToken, change.id, {
                quantity: change.quantity,
                expiry_date: change.expiryDate,
              }),
            ),
          ])
        : await Promise.allSettled(promises)

      // Process results
      let hasErrors = false
      const updatedInventory = inventory
        .filter((item) => !idsToDelete.has(item.id))
        .map((item) => {
          const changeIdx = changes.findIndex((c) => c.id === item.id)
          if (changeIdx === -1) return item
          // offset by number of delete promises
          const result = updateResults[promises.length + changeIdx]
          if (result && result.status === 'fulfilled') {
            const updated = result.value as { quantity: number; unit: string; expiry_date: string; ingredient: string; category?: string | null }
            return {
              ...item,
              quantity: updated.quantity,
              unit: updated.unit,
              expiryDate: updated.expiry_date,
              name: updated.ingredient,
              category: updated.category ?? item.category,
            }
          }
          if (result && result.status === 'rejected') hasErrors = true
          return item
        })

      setInventory(updatedInventory)
      if (hasErrors) {
        setError('Some items failed to save. Please check and try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save bulk changes.')
    } finally {
      setBulkSaving(false)
      setBulkEditMode(false)
      setBulkEdits({})
      setBulkSnapshot([])
      setBulkDeletedIds(new Set())
    }
  }

  const updateBulkEdit = (id: string, field: 'quantity' | 'expiryDate', value: number | string) => {
    setBulkEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }

  return (
    <section className="space-y-6">
      <div className="glass-card p-8">
        <h1 className="hero-title text-5xl font-semibold">{user.nickname || 'My'}'s Fridge</h1>
        <p className="mt-2 text-slate-600">Track what's fresh and what needs using soon.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 transition-colors duration-150"
            placeholder="Search ingredients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={bulkEditMode}
          />
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORY_TABS.map(({ key, label }) => (
              <button
                key={key}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${categoryTab === key ? 'border-emerald-500 bg-emerald-100 text-emerald-800 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}
                onClick={() => setCategoryTab(key)}
                disabled={bulkEditMode}
              >
                {label}
              </button>
            ))}
            {/* Edit All / Done / Cancel buttons */}
            {inventory.length > 0 && (
              <>
                {!bulkEditMode ? (
                  <button
                    onClick={enterBulkEditMode}
                    className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700 transition-all hover:bg-emerald-100"
                  >
                    ✏️ Edit All
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={saveBulkEdit}
                      disabled={bulkSaving}
                      className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {bulkSaving ? 'Saving...' : '✓ Done'}
                    </button>
                    <button
                      onClick={cancelBulkEdit}
                      disabled={bulkSaving}
                      className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
                    >
                      ✕ Cancel
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {bulkEditMode && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Bulk Edit Mode</strong> — Modify quantities and expiry dates below, then click <strong>Done</strong> to save all changes at once.
        </div>
      )}

      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {/* Skeleton cards while DB ingredients (images) are loading */}
        {!dbIngredientsLoaded && inventory.length > 0 && inventory.slice(0, 6).map((item) => (
          <div key={item.id} className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex">
              <div className="flex w-1/3 items-center justify-center p-4">
                <div className="h-28 w-full animate-pulse rounded-2xl bg-slate-200" />
              </div>
              <div className="flex w-2/3 flex-col justify-between p-5 pl-0">
                <div>
                  <div className="h-6 w-24 animate-pulse rounded-lg bg-slate-200" />
                  <div className="mt-2 h-5 w-36 animate-pulse rounded-full bg-slate-200" />
                </div>
                <div className="mt-3 flex gap-3">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-6 w-16 animate-pulse rounded bg-slate-200" />
                  <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
                </div>
              </div>
            </div>
          </div>
        ))}
        {error && <p className="text-sm text-rose-600 col-span-full">{error}</p>}
        {dbIngredientsLoaded && filteredGroups.map((group) => {
          const earliest = group.rows[0]
          const dl = daysLeft(group.earliestExpiryDate)
          const badge = getBadge(group.earliestExpiryDate)
          const isExpired = dl < 0
          const batchCount = group.rows.length

          // Get bulk edit values for this group's earliest item
          const bulkEdit = bulkEdits[earliest.id]
          const displayQty = bulkEditMode && bulkEdit ? bulkEdit.quantity : earliest.quantity
          const displayExpiry = bulkEditMode && bulkEdit ? bulkEdit.expiryDate : earliest.expiryDate

          const isBulkDeleted = bulkDeletedIds.has(earliest.id)

          return (
            <article
              key={group.name}
              className={`rounded-3xl border shadow-sm ${isExpired ? 'border-slate-400 bg-slate-300 text-slate-900' : 'glass-card'} ${bulkEditMode ? 'ring-2 ring-emerald-200' : ''} ${isBulkDeleted ? 'opacity-50' : ''}`}
            >
              <div className="flex">
                <div className="flex w-1/3 items-center justify-center p-4">
                  <img src={getIngredientImageUrl(group.name, imageUrlMap[group.name.toLowerCase()])} alt={group.name} className="h-28 w-full object-contain rounded-2xl" onError={(e) => { e.currentTarget.src = getIngredientImageUrl('fallback') }} />
                </div>
                <div className={`flex w-2/3 flex-col justify-between p-5 pl-0 ${isExpired ? 'text-slate-900' : ''}`}>
                  <div>
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold">{group.name}</h2>
                      {batchCount > 1 && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{batchCount} batches</span>
                      )}
                    </div>
                    <button className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge}`}>
                      Earliest Expiry: {formatDateAU(displayExpiry)} ({dl < 0 ? `${Math.abs(dl)}d overdue` : `${dl}d left`})
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {/* ── BULK EDIT MODE ── */}
                    {bulkEditMode ? (
                      <>
                        <div className="flex items-center gap-2">
                          <button
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-sm text-slate-600 hover:bg-slate-100"
                            onClick={() => updateBulkEdit(earliest.id, 'quantity', Math.max(0, (bulkEdit?.quantity ?? earliest.quantity) - stepByUnit(group.unit)))}
                            disabled={isBulkDeleted}
                          >−</button>
                          <input
                            type="number"
                            min={0}
                            step={stepByUnit(group.unit)}
                            value={displayQty}
                            onChange={(e) => updateBulkEdit(earliest.id, 'quantity', Math.max(0, Number(e.target.value) || 0))}
                            disabled={isBulkDeleted}
                            className="w-20 rounded-lg border border-emerald-300 bg-white px-2 py-1 text-center text-sm transition-colors duration-150 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                          />
                          <button
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-sm text-slate-600 hover:bg-slate-100"
                            onClick={() => updateBulkEdit(earliest.id, 'quantity', (bulkEdit?.quantity ?? earliest.quantity) + stepByUnit(group.unit))}
                            disabled={isBulkDeleted}
                          >+</button>
                        </div>
                        <span className="text-sm text-slate-500">{group.unit}</span>
                        <input
                          type="date"
                          value={displayExpiry}
                          onChange={(e) => updateBulkEdit(earliest.id, 'expiryDate', e.target.value)}
                          disabled={isBulkDeleted}
                          className="rounded-lg border border-emerald-300 bg-white px-2 py-1 text-sm transition-colors duration-150 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                        />
                        {/* Trash Delete / Undo button */}
                        <button
                          className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${isBulkDeleted ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
                          onClick={() => {
                            setBulkDeletedIds((prev) => {
                              const next = new Set(prev)
                              if (next.has(earliest.id)) {
                                next.delete(earliest.id) // toggle off
                              } else {
                                next.add(earliest.id)
                              }
                              return next
                            })
                          }}
                        >
                          {isBulkDeleted ? '↩ Undo' : '🗑️ Delete'}
                        </button>
                      </>
                    ) : editingGroup === group.name ? (
                      /* ── SINGLE EDIT MODE (existing) ── */
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
                      /* ── VIEW MODE (existing) ── */
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