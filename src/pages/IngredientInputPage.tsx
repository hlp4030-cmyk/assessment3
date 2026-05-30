import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../context/useAppState.ts'
import { createMyFridgeItem, fetchIngredients, getQuickAddSettings, upsertQuickAddSetting, deleteQuickAddSettingAPI } from '../lib/backendApi.ts'
import { mergeIngredients } from '../domain/rewards/rewardEngine.ts'
import type { DbIngredient, Ingredient } from '../types/models.ts'
import { toTitleCase } from '../utils/ingredientCatalog.ts'
import { getIngredientImageUrl, getIngredientEmoji } from '../utils/ingredientImages.ts'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { SectionContainer } from '../components/ui/SectionContainer.tsx'
import { Skeleton, SkeletonText, SkeletonCircle } from '../components/ui/Skeleton.tsx'

const DEFAULT_QUICK_ADD_NAMES = [
  'Oats', 'Rice', 'Pasta', 'Loaf Bread', 'Milk', 'Cheese', 'Yogurt', 'Eggs',
  'Beef Steak', 'Chicken Breast', 'Tomato', 'Avocado', 'Carrot', 'Banana', 'Strawberries',
]

const CATEGORY_EMOJI: Record<string, string> = {
  vegetables: '🥦',
  fruits: '🍎',
  meat: '🥩',
  seafood: '🐟',
  dairy: '🥛',
  grains: '🌾',
}

const CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: 'vegetables', label: 'Vegetables', icon: '🥦' },
  { key: 'fruits', label: 'Fruits', icon: '🍎' },
  { key: 'meat', label: 'Meat', icon: '🥩' },
  { key: 'seafood', label: 'Seafood', icon: '🐟' },
  { key: 'dairy', label: 'Dairy', icon: '🥛' },
  { key: 'grains', label: 'Grains', icon: '🌾' },
]

const stepByUnit = (unit: string) => {
  const u = unit.toLowerCase()
  if (u === 'ea') return 1
  if (u === 'g') return 10
  if (u === 'ml') return 10
  return 1
}

/** Calculate expiry date: today + default_shelf_life_days */
const calcExpiryDate = (shelfLifeDays: number): string => {
  const d = new Date()
  d.setDate(d.getDate() + shelfLifeDays)
  return d.toISOString().slice(0, 10)
}

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

  // DB-driven ingredient catalog
  const [dbIngredients, setDbIngredients] = useState<DbIngredient[]>([])
  const [ingredientsLoaded, setIngredientsLoaded] = useState(false)
  const [ingredientsError, setIngredientsError] = useState('')

  // Category filter
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  // Multiple dynamic edit rows (supports stacking selections)
  const [editRows, setEditRows] = useState<EditRow[]>([])

  // DB-driven Quick Add — initialize with hardcoded defaults for instant rendering
  const [quickAddSettings, setQuickAddSettings] = useState<Record<string, { quantity: number; unit: string }>>(() => {
    const defaults: Record<string, { quantity: number; unit: string }> = {}
    for (const name of DEFAULT_QUICK_ADD_NAMES) {
      defaults[toTitleCase(name)] = { quantity: 1, unit: 'ea' }
    }
    return defaults
  })
  const [editQuickAddMode, setEditQuickAddMode] = useState(false)
  const [addNewQuickAdd, setAddNewQuickAdd] = useState('')

  // Bulk save progress
  const [saveProgress, setSaveProgress] = useState<{ current: number; total: number } | null>(null)

  // Build lookup maps from DB ingredients
  const ingredientByName = useMemo(() => {
    const map: Record<string, DbIngredient> = {}
    for (const ing of dbIngredients) {
      map[ing.name.toLowerCase()] = ing
    }
    return map
  }, [dbIngredients])

  const ingredientNames = useMemo(() => dbIngredients.map((i) => toTitleCase(i.name)), [dbIngredients])

  // Reset temp state on mount/unmount
  useEffect(() => {
    setPending([])
    setSelectedAuto([])
    setValidationWarnings([])
    setApplySuccess(false)
    setIsApplying(false)
    setEditRows([])
    setEditQuickAddMode(false)
    setAddNewQuickAdd('')
    setSaveProgress(null)
    return () => {
      setPending([])
      setSelectedAuto([])
      setValidationWarnings([])
      setApplySuccess(false)
      setIsApplying(false)
      setEditRows([])
    }
  }, [])

  // Fetch ingredients from DB on mount
  useEffect(() => {
    const load = async () => {
      try {
        const rows = await fetchIngredients()
        setDbIngredients(rows)
        setIngredientsError('')
      } catch {
        setIngredientsError('Failed to load ingredient catalog. Please refresh.')
      }
      setIngredientsLoaded(true)
    }
    void load()
  }, [])

  // Fetch Quick Add settings from DB on mount (runs in parallel with fetchIngredients)
  useEffect(() => {
    const load = async () => {
      if (!authSession?.accessToken) return
      try {
        const rows = await getQuickAddSettings(authSession.accessToken)

        // Build default quick add from DB ingredients (if available)
        const defaultQuickAdd = DEFAULT_QUICK_ADD_NAMES
          .map((name) => {
            const db = dbIngredients.find((ing) => ing.name.toLowerCase() === name.toLowerCase())
            if (!db) return null
            return {
              ingredient_name: db.name,
              default_quantity: db.default_quantity,
              unit: db.standard_unit,
            }
          })
          .filter((item): item is { ingredient_name: string; default_quantity: number; unit: string } => item !== null)

        const merged: Record<string, { quantity: number; unit: string }> = {}
        for (const item of defaultQuickAdd) {
          const key = toTitleCase(item.ingredient_name)
          merged[key] = { quantity: item.default_quantity, unit: item.unit }
        }

        // Overlay DB settings on top
        for (const row of rows) {
          const key = toTitleCase(row.ingredient_name)
          merged[key] = { quantity: row.default_quantity, unit: row.unit }
        }

        if (Object.keys(merged).length > 0) {
          setQuickAddSettings(merged)
        }
      } catch {
        // Keep the hardcoded defaults already in state
      }
    }
    void load()
  }, [authSession?.accessToken, dbIngredients])

  // Quick add names derived from settings
  const quickAddNames = useMemo(() => Object.keys(quickAddSettings), [quickAddSettings])

  // Track which ingredients are already in the pending tray
  const pendingNames = useMemo(() => new Set(pending.map((p) => p.name.toLowerCase())), [pending])

  // Track which ingredients are already in edit rows
  const editRowNames = useMemo(() => new Set(editRows.map((r) => r.name.toLowerCase())), [editRows])

  // Compute displayed items: search text filter + category filter
  const displayedItems = useMemo(() => {
    let items = ingredientNames
    if (activeCategory) {
      items = items.filter((item) => {
        const db = ingredientByName[item.toLowerCase()]
        return db?.category === activeCategory
      })
    }
    if (query.length > 0) {
      items = items.filter((x) => x.toLowerCase().includes(query.toLowerCase()))
    }
    if (query.length === 0 && !activeCategory) return []
    return items
  }, [query, activeCategory, ingredientNames, ingredientByName])

  const addPending = (name: string, source: Ingredient['source'], override?: { quantity?: number; unit?: string; expiryDate?: string }) => {
    const db = ingredientByName[name.toLowerCase()]
    const today = new Date().toISOString().slice(0, 10)
    const defaultQty = override?.quantity ?? db?.default_quantity ?? 1
    const defaultUnit = override?.unit ?? db?.standard_unit ?? 'ea'
    const defaultExpiry = override?.expiryDate ?? (db ? calcExpiryDate(db.default_shelf_life_days) : today)
    const category = db?.category ?? 'vegetables'
    const icon = CATEGORY_EMOJI[category] ?? '🥗'

    setPending((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${name}-${prev.length}`,
        name: toTitleCase(name),
        icon,
        quantity: defaultQty,
        unit: defaultUnit,
        category,
        purchaseDate: today,
        expiryDate: defaultExpiry,
        source,
      },
    ])
  }

  // Toggle edit row for search/category item — stacks onto editRows array or removes if already selected
  const openEditRow = (name: string) => {
    const lowerName = name.toLowerCase()

    // If already in edit rows, deselect by removing it
    if (editRowNames.has(lowerName)) {
      setEditRows((prev) => prev.filter((r) => r.name.toLowerCase() !== lowerName))
      return
    }

    // If already confirmed into pending tray, deselect by removing from pending and selectedAuto
    if (selectedAuto.includes(toTitleCase(name))) {
      setSelectedAuto((prev) => prev.filter((n) => n.toLowerCase() !== lowerName))
      setPending((prev) => prev.filter((p) => p.name.toLowerCase() !== lowerName))
      return
    }

    const db = ingredientByName[lowerName]
    const today = new Date().toISOString().slice(0, 10)
    const newRow: EditRow = {
      name: toTitleCase(name),
      quantity: db?.default_quantity ?? 1,
      unit: db?.standard_unit ?? 'ea',
      expiryDate: db ? calcExpiryDate(db.default_shelf_life_days) : today,
    }
    setEditRows((prev) => [...prev, newRow])
  }

  // Confirm a single edit row into pending tray
  const confirmSingleEditRow = (index: number) => {
    const row = editRows[index]
    if (!row) return
    addPending(row.name, 'autocomplete', { quantity: row.quantity, unit: row.unit, expiryDate: row.expiryDate })
    setSelectedAuto((prev) => (prev.includes(row.name) ? prev : [...prev, row.name]))
    setEditRows((prev) => prev.filter((_, i) => i !== index))
  }

  // Confirm all edit rows into pending tray at once
  const confirmAllEditRows = () => {
    for (const row of editRows) {
      addPending(row.name, 'autocomplete', { quantity: row.quantity, unit: row.unit, expiryDate: row.expiryDate })
      setSelectedAuto((prev) => (prev.includes(row.name) ? prev : [...prev, row.name]))
    }
    setEditRows([])
  }

  // Remove a single edit row without confirming
  const removeEditRow = (index: number) => {
    setEditRows((prev) => prev.filter((_, i) => i !== index))
  }

  // Update a field on a specific edit row
  const updateEditRow = (index: number, field: keyof EditRow, value: string | number) => {
    setEditRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (displayedItems.length === 1) {
        openEditRow(displayedItems[0])
      }
    }
  }

  const toggleCategory = (key: string) => {
    setActiveCategory((prev) => (prev === key ? null : key))
    setEditRows([])
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
      // Silent fail
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

  // Available ingredients not yet in Quick Add
  const availableNewQuickAdd = useMemo(
    () => ingredientNames.filter((name) => !quickAddSettings[name]),
    [ingredientNames, quickAddSettings],
  )

  // Add new ingredient to quick add
  const addNewQuickAddItem = async () => {
    const name = toTitleCase(addNewQuickAdd.trim())
    if (!name || quickAddSettings[name]) return
    const db = ingredientByName[name.toLowerCase()]
    const unit = db?.standard_unit ?? 'ea'
    const qty = db?.default_quantity ?? 1
    const settings = { quantity: qty, unit }
    setQuickAddSettings((prev) => ({ ...prev, [name]: settings }))
    setAddNewQuickAdd('')
    await saveQuickAddSetting(name, qty, unit)
  }

  // Quick Add card click
  const quickAddClick = (name: string) => {
    const settings = quickAddSettings[name]
    if (!settings) return
    addPending(name, 'quick-add', { quantity: settings.quantity, unit: settings.unit })
  }

  // Batch save with progress indicator (batches of 5 for balance of speed + feedback)
  const applyToFridge = async () => {
    if (!authSession?.accessToken || isApplying) return
    setIsApplying(true)
    setSaveProgress({ current: 0, total: pending.length })

    const BATCH_SIZE = 5
    const persistedItems: Ingredient[] = []

    try {
      for (let i = 0; i < pending.length; i += BATCH_SIZE) {
        const batch = pending.slice(i, i + BATCH_SIZE)
        const results = await Promise.allSettled(
          batch.map((item) =>
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

        for (const result of results) {
          if (result.status === 'fulfilled') persistedItems.push(result.value)
        }

        const completed = Math.min(i + BATCH_SIZE, pending.length)
        setSaveProgress({ current: completed, total: pending.length })
      }

      setInventory((prev) => mergeIngredients(prev, persistedItems))
      setPending([])
      setSelectedAuto([])
      setApplySuccess(true)
      window.setTimeout(() => setApplySuccess(false), 1800)
    } finally {
      setIsApplying(false)
      setSaveProgress(null)
    }
  }

  const updatePending = (id: string, patch: Partial<Ingredient>) => {
    setPending((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    )
  }

  // Loading state
  if (!ingredientsLoaded) {
    return (
      <SectionContainer>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Search Card Skeleton */}
          <Card>
            <Skeleton className="h-7 w-40 rounded-lg" />
            <Skeleton className="mt-3 h-11 w-full rounded-xl" />
            <div className="mt-3 flex flex-wrap gap-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-24 rounded-full" />
              ))}
            </div>
            <SkeletonText className="mt-4" lines={4} widths={['w-full', 'w-5/6', 'w-3/4', 'w-1/2']} />
          </Card>
          {/* Quick Add Card Skeleton */}
          <Card>
            <Skeleton className="h-7 w-32 rounded-lg" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <SkeletonCircle size={48} className="rounded-lg" />
                    <Skeleton className="h-4 w-20 rounded" />
                  </div>
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </Card>
        </div>
        {/* Confirmation Tray Skeleton */}
        <Card>
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="mt-2 h-4 w-72 rounded" />
          <Skeleton className="mt-4 h-10 w-44 rounded-full" />
        </Card>
      </SectionContainer>
    )
  }

  // Error state
  if (ingredientsError) {
    return (
      <SectionContainer>
        <Card>
          <h2 className="text-2xl font-semibold">Search Ingredients</h2>
          <p className="mt-4 text-sm text-rose-600">{ingredientsError}</p>
          <Button className="mt-3" onClick={() => window.location.reload()}>Retry</Button>
        </Card>
      </SectionContainer>
    )
  }

  return (
    <SectionContainer>
      <div className="fade-in-up grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-2xl font-semibold">Search Ingredients</h2>
          <div className="mt-3 flex items-center rounded-xl border border-slate-400 bg-white p-2">
            <input
              className="w-full bg-transparent p-1 outline-none"
              placeholder="Type ingredient..."
              value={query}
              onChange={(e) => { setQuery(e.target.value) }}
              onKeyDown={handleSearchKeyDown}
            />
            {query && <button className="rounded-full px-2 text-slate-500 hover:bg-slate-100" onClick={() => { setQuery('') }}>✕</button>}
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
                  selectedAuto.includes(item) || editRowNames.has(item.toLowerCase())
                    ? 'bg-slate-900 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
                onClick={() => openEditRow(item)}
              >
                {item}
              </button>
            ))}
          </div>
          {displayedItems.length === 1 && !editRowNames.has(displayedItems[0].toLowerCase()) && (
            <p className="mt-2 text-xs text-slate-400">Press <kbd className="rounded border border-slate-300 px-1">Enter</kbd> to select <strong>{displayedItems[0]}</strong></p>
          )}

          {/* Dynamic Temporary Edit Rows — stacked for multi-selection */}
          {editRows.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-emerald-800">Staged selections ({editRows.length}):</p>
                <button
                  onClick={confirmAllEditRows}
                  className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
                >
                  ✓ Confirm All
                </button>
              </div>
              {editRows.map((row, index) => (
                <div key={`${row.name}-${index}`} className="rounded-2xl border border-emerald-300 bg-emerald-50/40 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-emerald-600 px-3 py-1 text-sm font-semibold text-white">{row.name}</span>
                    <div className="flex items-center gap-1">
                      <button className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-sm text-slate-600 hover:bg-slate-100" onClick={() => updateEditRow(index, 'quantity', Math.max(0, row.quantity - stepByUnit(row.unit)))}>−</button>
                      <input type="number" min={0} step={stepByUnit(row.unit)} value={row.quantity} onChange={(e) => updateEditRow(index, 'quantity', Number(e.target.value) || 0)} className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm text-slate-800" />
                      <button className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-sm text-slate-600 hover:bg-slate-100" onClick={() => updateEditRow(index, 'quantity', row.quantity + stepByUnit(row.unit))}>+</button>
                    </div>
                    <span className="rounded-lg border border-slate-300 bg-slate-100 px-2 py-1 text-sm text-slate-600">{row.unit}</span>
                    <input type="date" value={row.expiryDate} onChange={(e) => updateEditRow(index, 'expiryDate', e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800" />
                    <button onClick={() => confirmSingleEditRow(index)} className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700" aria-label="Confirm add">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </button>
                    <button onClick={() => removeEditRow(index)} className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-50" aria-label="Remove">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                </div>
              ))}
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

          <div className="mt-4 grid grid-cols-2 gap-3">
            {quickAddNames.map((name) => {
              const settings = quickAddSettings[name]
              if (!settings) return null
              const db = ingredientByName[name.toLowerCase()]
              return (
                <div key={name} className={`rounded-2xl border p-4 text-left transition-colors ${editQuickAddMode ? 'border-emerald-300 bg-emerald-50/30' : 'border-emerald-200'}`}>
                  <div className="flex items-center gap-2">
                    {ingredientsLoaded && db ? (
                      <img
                        src={getIngredientImageUrl(name, db.image_url)}
                        alt={name}
                        className="w-12 h-12 object-contain shrink-0 rounded-lg bg-slate-50"
                        onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden') }}
                      />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-50 text-2xl shrink-0">{getIngredientEmoji(db?.category)}</span>
                    )}
                    <span className="text-2xl hidden">{getIngredientEmoji(db?.category)}</span>
                    <span className="font-medium text-sm leading-tight">{name}</span>
                  </div>
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
                      {pendingNames.has(name.toLowerCase()) ? (
                        <button
                          className="mt-2 w-full rounded-lg border border-emerald-300 bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 active:scale-95"
                          onClick={() => setPending((prev) => prev.filter((p) => p.name.toLowerCase() !== name.toLowerCase()))}
                        >
                          ✓ In Tray
                        </button>
                      ) : (
                        <button
                          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95"
                          onClick={() => quickAddClick(name)}
                        >
                          + Add to tray
                        </button>
                      )}
                    </>
                  )}
                </div>
              )
            })}
            {/* Add New card in edit mode */}
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
              <span className="rounded-2xl border border-slate-300 bg-slate-100 p-3 text-sm text-slate-600">{item.unit}</span>
              <input type="date" value={item.expiryDate} onChange={(e) => updatePending(item.id, { expiryDate: e.target.value })} className="rounded-2xl border border-slate-200 p-3 transition-colors duration-150" />
              <Button variant="ghost" onClick={() => setPending((prev) => prev.filter((x) => x.id !== item.id))}>Delete</Button>
            </div>
          ))}
          {pending.length === 0 && <p className="text-slate-500">No pending items yet.</p>}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {isApplying && saveProgress ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <div className="h-2 w-48 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                    style={{ width: `${(saveProgress.current / saveProgress.total) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-emerald-700">Saving {saveProgress.current}/{saveProgress.total} items...</span>
              </div>
              <p className="text-xs text-slate-400">You can safely leave this page; saving will continue in the background.</p>
            </div>
          ) : (
            <Button onClick={applyToFridge} disabled={pending.length === 0} loading={isApplying} loadingText="Saving...">Save to My Fridge</Button>
          )}
          <Button variant="secondary" onClick={() => navigate('/my-fridge')}>Go to My Fridge</Button>
        </div>
        {applySuccess && <p className="mt-3 text-sm font-semibold text-emerald-700">Successfully updated!</p>}
        <p className="mt-4 text-slate-600">Items currently in inventory: <span className="font-semibold text-slate-900">{inventory.length}</span></p>
      </Card>
    </SectionContainer>
  )
}