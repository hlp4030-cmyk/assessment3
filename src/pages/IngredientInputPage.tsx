import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../context/useAppState.ts'
import { createMyFridgeItem, getQuickAddSettings, upsertQuickAddSetting, deleteQuickAddSettingAPI } from '../lib/backendApi.ts'
import { recommendExpiryDate } from '../domain/expiry/recommendExpiryDate.ts'
import { mergeIngredients } from '../domain/rewards/rewardEngine.ts'
import type { Ingredient } from '../types/models.ts'
import { MASTER_INGREDIENTS, toTitleCase, validateIngredientName, CATEGORIES, getCategoryForIngredient } from '../utils/ingredientCatalog.ts'
import type { IngredientCategory } from '../utils/ingredientCatalog.ts'
import { VALID_UNITS, getUnitForIngredient } from '../utils/unitRules.ts'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { SectionContainer } from '../components/ui/SectionContainer.tsx'

const options = MASTER_INGREDIENTS.map(toTitleCase)
const UNIT_OPTIONS = VALID_UNITS

const stepByUnit = (unit: string) => {
  const u = unit.toLowerCase()
  if (u === 'ea') return 1
  if (u === 'g') return 10
  if (u === 'ml') return 10
  return 1
}

const defaultUnitByName = (name: string) => getUnitForIngredient(name)

// Default quick add items (used as fallback when DB is empty)
const DEFAULT_QUICK_ADD: { ingredient_name: string; default_quantity: number; unit: string }[] = [
  'Eggs', 'Milk', 'Chicken', 'Rice', 'Tomatoes', 'Spinach',
  'Pasta', 'Onion', 'Garlic', 'Bread', 'Cheese', 'Butter',
].map((name) => ({
  ingredient_name: name,
  default_quantity: 1,
  unit: defaultUnitByName(name),
}))

interface EditRow {
  name: string
  quantity: number
  unit: string
  expiryDate: string
}

export function IngredientInputPage() {
  const { inventory, setInventory, authSession } = useAppState()
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState<Ingredient[]>([])
  const [selectedAuto, setSelectedAuto] = useState<string[]>([])
  const [, setValidationWarnings] = useState<string[]>([])
  const [applySuccess, setApplySuccess] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const navigate = useNavigate()

  // Category filter
  const [activeCategory, setActiveCategory] = useState<IngredientCategory | null>(null)
  // Dynamic edit row
  const [editRow, setEditRow] = useState<EditRow | null>(null)

  // DB-driven Quick Add
  const [quickAddSettings, setQuickAddSettings] = useState<Record<string, { quantity: number; unit: string }>>({})
  const [quickAddLoaded, setQuickAddLoaded] = useState(false)
  const [editQuickAddMode, setEditQuickAddMode] = useState(false)
  const [addNewQuickAdd, setAddNewQuickAdd] = useState('') // ingredient name picker

  // Reset temp state on mount/unmount
  useEffect(() => {
    setPending([])
    setSelectedAuto([])
    setValidationWarnings([])
    setApplySuccess(false)
    setIsApplying(false)
    setEditRow(null)
    setEditQuickAddMode(false)
    setAddNewQuickAdd('')
    return () => {
      setPending([])
      setSelectedAuto([])
      setValidationWarnings([])
      setApplySuccess(false)
      setIsApplying(false)
      setEditRow(null)
    }
  }, [])

  // Fetch Quick Add settings from DB on mount — MERGE with defaults
  useEffect(() => {
    const load = async () => {
      if (!authSession?.accessToken) { setQuickAddLoaded(true); return }
      try {
        const rows = await getQuickAddSettings(authSession.accessToken)

        // Always start with the default 12 items as the base
        const merged: Record<string, { quantity: number; unit: string }> = {}
        for (const item of DEFAULT_QUICK_ADD) {
          const key = toTitleCase(item.ingredient_name)
          merged[key] = { quantity: item.default_quantity, unit: item.unit }
        }

        // Overlay DB settings on top (user customizations override defaults)
        for (const row of rows) {
          const key = toTitleCase(row.ingredient_name)
          if (merged[key]) {
            // Override default quantity/unit with user's DB preference
            merged[key] = { quantity: row.default_quantity, unit: row.unit }
          } else {
            // User-added custom ingredient (not in defaults) — resolve correct unit
            merged[key] = { quantity: row.default_quantity, unit: row.unit || defaultUnitByName(key) }
          }
        }

        setQuickAddSettings(merged)
      } catch {
        // Fallback to defaults only
        const map: Record<string, { quantity: number; unit: string }> = {}
        for (const item of DEFAULT_QUICK_ADD) {
          map[toTitleCase(item.ingredient_name)] = { quantity: item.default_quantity, unit: item.unit }
        }
        setQuickAddSettings(map)
      }
      setQuickAddLoaded(true)
    }
    void load()
  }, [authSession?.accessToken])

  // Quick add names derived from settings
  const quickAddNames = useMemo(() => Object.keys(quickAddSettings), [quickAddSettings])

  // Compute displayed items: search text filter + category filter
  const displayedItems = useMemo(() => {
    let items = options
    if (activeCategory) {
      items = items.filter((item) => getCategoryForIngredient(item) === activeCategory)
    }
    if (query.length > 0) {
      items = items.filter((x) => x.toLowerCase().includes(query.toLowerCase()))
    }
    if (query.length === 0 && !activeCategory) return []
    return items
  }, [query, activeCategory])

  const addPending = (name: string, source: Ingredient['source'], override?: { quantity?: number; unit?: string }) => {
    const validated = validateIngredientName(name)
    const today = new Date().toISOString().slice(0, 10)
    if (validated.flagged) {
      setValidationWarnings((prev) => [...prev, `"${name}" is not in the ingredient list. Please review before saving.`])
    }
    if (validated.correctedFrom) {
      setValidationWarnings((prev) => [...prev, `Auto-corrected "${validated.correctedFrom}" to "${toTitleCase(validated.finalName)}".`])
    }
    setPending((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${name}-${prev.length}`,
        name: toTitleCase(validated.finalName),
        icon: '🥗',
        quantity: override?.quantity ?? 1,
        unit: override?.unit ?? defaultUnitByName(validated.finalName),
        category: 'General',
        purchaseDate: today,
        expiryDate: recommendExpiryDate(validated.finalName, today),
        source,
      },
    ])
  }

  // Open edit row for search/category item
  const openEditRow = (name: string) => {
    const today = new Date().toISOString().slice(0, 10)
    setEditRow({
      name: toTitleCase(name),
      quantity: 1,
      unit: defaultUnitByName(name),
      expiryDate: recommendExpiryDate(name, today),
    })
  }

  const confirmEditRow = () => {
    if (!editRow) return
    addPending(editRow.name, 'autocomplete', { quantity: editRow.quantity, unit: editRow.unit })
    setPending((prev) => {
      const last = prev[prev.length - 1]
      if (!last) return prev
      return prev.map((item) => item.id === last.id ? { ...item, expiryDate: editRow.expiryDate } : item)
    })
    setSelectedAuto((prev) => (prev.includes(editRow.name) ? prev : [...prev, editRow.name]))
    setEditRow(null)
    setQuery('')
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (displayedItems.length === 1) {
        openEditRow(displayedItems[0])
      }
    }
  }

  const toggleCategory = (key: IngredientCategory) => {
    setActiveCategory((prev) => (prev === key ? null : key))
    setEditRow(null)
  }

  // Save a quick add setting to DB
  const saveQuickAddSetting = async (ingredientName: string, quantity: number, unit: string) => {
    if (!authSession?.accessToken) return
    try {
      await upsertQuickAddSetting(authSession.accessToken, {
        ingredient_name: ingredientName.toLowerCase(),
        default_quantity: quantity,
        unit,
      })
    } catch {
      // Silent fail — local state still updated
    }
  }

  // Delete a quick add setting from DB
  const removeQuickAddSetting = async (ingredientName: string) => {
    if (!authSession?.accessToken) return
    try {
      await deleteQuickAddSettingAPI(authSession.accessToken, ingredientName.toLowerCase())
    } catch {
      // Silent fail
    }
  }

  // Available ingredients not yet in Quick Add (for dropdown picker)
  const availableNewQuickAdd = useMemo(
    () => options.filter((name) => !quickAddSettings[name]),
    [quickAddSettings],
  )

  // Add new ingredient to quick add (from dropdown — always valid)
  const addNewQuickAddItem = async () => {
    const name = toTitleCase(addNewQuickAdd.trim())
    if (!name || quickAddSettings[name]) return
    const unit = getUnitForIngredient(name) // always resolve from catalog
    const settings = { quantity: 1, unit }
    setQuickAddSettings((prev) => ({ ...prev, [name]: settings }))
    setAddNewQuickAdd('')
    await saveQuickAddSetting(name, 1, unit)
  }

  // Quick Add card click (default mode): add to pending using DB defaults
  const quickAddClick = (name: string) => {
    const settings = quickAddSettings[name]
    if (!settings) return
    addPending(name, 'quick-add', { quantity: settings.quantity, unit: settings.unit })
  }

  // Batch save
  const applyToFridge = async () => {
    if (!authSession?.accessToken || isApplying) return
    setIsApplying(true)
    try {
      const results = await Promise.allSettled(
        pending.map((item) =>
          createMyFridgeItem(authSession.accessToken, {
            ingredient: item.name,
            quantity: item.quantity,
            unit: item.unit,
            expiry_date: item.expiryDate,
            status: 'in_fridge',
            category: item.category,
          }).then((created) => ({
            ...item,
            id: created.id,
            name: created.ingredient,
            quantity: created.quantity,
            unit: created.unit,
            expiryDate: created.expiry_date,
            category: created.category ?? item.category,
          })),
        ),
      )
      const persistedItems: Ingredient[] = []
      for (const result of results) {
        if (result.status === 'fulfilled') persistedItems.push(result.value)
      }
      setInventory((prev) => mergeIngredients(prev, persistedItems))
      setPending([])
      setSelectedAuto([])
      setApplySuccess(true)
      window.setTimeout(() => setApplySuccess(false), 1800)
    } finally {
      setIsApplying(false)
    }
  }

  const updatePending = (id: string, patch: Partial<Ingredient>) => {
    setPending((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const next = { ...item, ...patch }
        if (patch.name || patch.purchaseDate) {
          next.expiryDate = recommendExpiryDate(next.name, next.purchaseDate)
        }
        return next
      }),
    )
  }

  return (
    <SectionContainer>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-2xl font-semibold">Search Ingredients</h2>
          <div className="mt-3 flex items-center rounded-xl border border-slate-400 bg-white p-2">
            <input
              className="w-full bg-transparent p-1 outline-none"
              placeholder="Type ingredient..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setEditRow(null) }}
              onKeyDown={handleSearchKeyDown}
            />
            {query && <button className="rounded-full px-2 text-slate-500 hover:bg-slate-100" onClick={() => { setQuery(''); setEditRow(null) }}>✕</button>}
          </div>

          {/* Category Icon Filter Bar */}
          <div className="mt-3 flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => toggleCategory(cat.key)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                  activeCategory === cat.key
                    ? 'border-emerald-500 bg-emerald-100 text-emerald-800 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Search Results / Category Filtered List */}
          <div className="mt-3 flex flex-wrap gap-2">
            {query.length > 0 && displayedItems.length === 0 && (
              <p className="text-sm text-slate-400">No matching ingredients found.</p>
            )}
            {activeCategory && !query && displayedItems.length > 0 && (
              <p className="w-full text-xs text-slate-400 mb-1">
                {CATEGORIES.find((c) => c.key === activeCategory)?.icon} Showing {activeCategory} ingredients
              </p>
            )}
            {displayedItems.map((item) => (
              <button
                key={item}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  selectedAuto.includes(item) || editRow?.name === item
                    ? 'bg-slate-900 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
                onClick={() => openEditRow(item)}
              >
                {item}
              </button>
            ))}
          </div>
          {displayedItems.length === 1 && !editRow && (
            <p className="mt-2 text-xs text-slate-400">Press <kbd className="rounded border border-slate-300 px-1">Enter</kbd> to select <strong>{displayedItems[0]}</strong></p>
          )}

          {/* Dynamic Temporary Edit Row */}
          {editRow && (
            <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50/40 p-4">
              <p className="mb-2 text-sm font-medium text-emerald-800">Configure & add:</p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-emerald-600 px-3 py-1 text-sm font-semibold text-white">{editRow.name}</span>
                <div className="flex items-center gap-1">
                  <button className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-sm text-slate-600 hover:bg-slate-100" onClick={() => setEditRow((prev) => prev ? { ...prev, quantity: Math.max(0, prev.quantity - stepByUnit(prev.unit)) } : prev)}>−</button>
                  <input type="number" min={0} step={stepByUnit(editRow.unit)} value={editRow.quantity} onChange={(e) => setEditRow((prev) => prev ? { ...prev, quantity: Number(e.target.value) || 0 } : prev)} className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm text-slate-800" />
                  <button className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-sm text-slate-600 hover:bg-slate-100" onClick={() => setEditRow((prev) => prev ? { ...prev, quantity: prev.quantity + stepByUnit(prev.unit) } : prev)}>+</button>
                </div>
                <select value={editRow.unit} onChange={(e) => setEditRow((prev) => prev ? { ...prev, unit: e.target.value } : prev)} className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800">
                  {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                <input type="date" value={editRow.expiryDate} onChange={(e) => setEditRow((prev) => prev ? { ...prev, expiryDate: e.target.value } : prev)} className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800" />
                <button onClick={confirmEditRow} className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700" aria-label="Confirm add">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </button>
                <button onClick={() => setEditRow(null)} className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-50" aria-label="Cancel">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* Quick Add Panel — DB-driven */}
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Quick Add</h2>
            {!editQuickAddMode ? (
              <button onClick={() => setEditQuickAddMode(true)} className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100">✏️ Edit Quick Add</button>
            ) : (
              <button onClick={() => setEditQuickAddMode(false)} className="rounded-full border border-emerald-300 bg-emerald-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-emerald-700">✓ Done</button>
            )}
          </div>

          {!quickAddLoaded ? (
            <p className="mt-4 text-sm text-slate-400">Loading preferences...</p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {quickAddNames.map((name) => {
                const settings = quickAddSettings[name]
                if (!settings) return null
                return (
                  <div key={name} className={`rounded-2xl border p-4 text-left transition-colors ${editQuickAddMode ? 'border-emerald-300 bg-emerald-50/30' : 'border-emerald-200'}`}>
                    <p className="font-medium">{name}</p>
                    {editQuickAddMode ? (
                      <>
                        <div className="mt-2 flex items-center gap-1.5">
                          <button className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-xs text-slate-600 hover:bg-slate-100" onClick={() => {
                            const newQty = Math.max(0, settings.quantity - stepByUnit(settings.unit))
                            setQuickAddSettings((prev) => ({ ...prev, [name]: { ...prev[name], quantity: newQty } }))
                            void saveQuickAddSetting(name, newQty, settings.unit)
                          }}>−</button>
                          <input type="number" min={0} step={stepByUnit(settings.unit)} value={settings.quantity} onChange={(e) => {
                            const newQty = Number(e.target.value) || 0
                            setQuickAddSettings((prev) => ({ ...prev, [name]: { ...prev[name], quantity: newQty } }))
                          }} onBlur={() => saveQuickAddSetting(name, settings.quantity, settings.unit)} className="w-12 rounded-lg border border-slate-200 px-1 py-0.5 text-center text-xs text-slate-800" />
                          <button className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-xs text-slate-600 hover:bg-slate-100" onClick={() => {
                            const newQty = settings.quantity + stepByUnit(settings.unit)
                            setQuickAddSettings((prev) => ({ ...prev, [name]: { ...prev[name], quantity: newQty } }))
                            void saveQuickAddSetting(name, newQty, settings.unit)
                          }}>+</button>
                          <span className="text-xs text-slate-500">{settings.unit}</span>
                        </div>
                        <button className="mt-2 text-xs font-medium text-rose-500 hover:text-rose-700" onClick={() => {
                          setQuickAddSettings((prev) => { const next = { ...prev }; delete next[name]; return next })
                          void removeQuickAddSetting(name)
                        }}>✕ Remove</button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-slate-500">{settings.quantity} {settings.unit}</p>
                        <button className="mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-800" onClick={() => quickAddClick(name)}>+ Add to tray</button>
                      </>
                    )}
                  </div>
                )
              })}
              {/* Add New card in edit mode — dropdown picker */}
              {editQuickAddMode && (
                <div className="rounded-2xl border-2 border-dashed border-slate-300 p-4">
                  <p className="text-sm font-medium text-slate-600">+ Add New</p>
                  <div className="mt-2 flex flex-col gap-1">
                    <select
                      value={addNewQuickAdd}
                      onChange={(e) => setAddNewQuickAdd(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800"
                    >
                      <option value="">Select ingredient...</option>
                      {availableNewQuickAdd.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => void addNewQuickAddItem()}
                      disabled={!addNewQuickAdd}
                      className="rounded-lg bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="text-2xl font-semibold">Final confirmation tray</h2>
        <p className="mt-1 text-slate-600">Review all staged items before applying to your fridge.</p>
        <div className="mt-4 space-y-3">
          {pending.map((item) => (
            <div key={item.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-5 md:items-center">
              <p className="font-medium">{item.name}</p>
              <input type="number" min={0} step={stepByUnit(item.unit)} value={item.quantity} onChange={(e) => updatePending(item.id, { quantity: Number(e.target.value) || 0 })} className="rounded-2xl border border-slate-200 p-3 transition-colors duration-150" />
              <select value={item.unit} onChange={(e) => updatePending(item.id, { unit: e.target.value })} className="rounded-2xl border border-slate-200 p-3 transition-colors duration-150">
                {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <input type="date" value={item.expiryDate} onChange={(e) => updatePending(item.id, { expiryDate: e.target.value })} className="rounded-2xl border border-slate-200 p-3 transition-colors duration-150" />
              <Button variant="ghost" onClick={() => setPending((prev) => prev.filter((x) => x.id !== item.id))}>Delete</Button>
            </div>
          ))}
          {pending.length === 0 && <p className="text-slate-500">No pending items yet.</p>}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={applyToFridge} disabled={pending.length === 0} loading={isApplying} loadingText="Saving...">Save to My Fridge</Button>
          <Button variant="secondary" onClick={() => navigate('/my-fridge')}>Go to My Fridge</Button>
        </div>
        {applySuccess && <p className="mt-3 text-sm font-semibold text-emerald-700">Successfully updated!</p>}
        <p className="mt-4 text-slate-600">Items currently in inventory: <span className="font-semibold text-slate-900">{inventory.length}</span></p>
      </Card>
    </SectionContainer>
  )
}