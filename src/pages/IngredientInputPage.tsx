import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../context/useAppState.ts'
import { createMyFridgeItem } from '../lib/backendApi.ts'
import { recommendExpiryDate } from '../domain/expiry/recommendExpiryDate.ts'
import { parseIngredientLine } from '../domain/parser/parseIngredientLine.ts'
import { mergeIngredients } from '../domain/rewards/rewardEngine.ts'
import type { Ingredient } from '../types/models.ts'
import { MASTER_INGREDIENTS, toTitleCase, validateIngredientName } from '../utils/ingredientCatalog.ts'
import { VALID_UNITS, getUnitForIngredient } from '../utils/unitRules.ts'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { SectionContainer } from '../components/ui/SectionContainer.tsx'

const frequent = ['Milk', 'Eggs', 'Tomatoes', 'Spinach', 'Chicken']
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

export function IngredientInputPage() {
  const { inventory, setInventory, user, authSession } = useAppState()
  const [line, setLine] = useState('10pcs eggs, 500g chicken, 500g rice, 5 tomatoes, 500g pasta, 5pcs broccoli')
  const [addedFlag, setAddedFlag] = useState(false)
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState<Ingredient[]>([])
  const [selectedAuto, setSelectedAuto] = useState<string[]>([])
  const [quickSelected, setQuickSelected] = useState<string[]>([])
  const [validationWarnings, setValidationWarnings] = useState<string[]>([])
  const [applySuccess, setApplySuccess] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const navigate = useNavigate()

  // Reset all temporary state on mount and unmount to prevent stale data
  // persisting across navigation.
  useEffect(() => {
    setPending([])
    setSelectedAuto([])
    setQuickSelected([])
    setValidationWarnings([])
    setApplySuccess(false)
    setIsApplying(false)
    return () => {
      setPending([])
      setSelectedAuto([])
      setQuickSelected([])
      setValidationWarnings([])
      setApplySuccess(false)
      setIsApplying(false)
    }
  }, [])

  const suggestions = useMemo(() => options.filter((x) => x.toLowerCase().includes(query.toLowerCase())), [query])

  const parsedPreview = useMemo(
    () =>
      parseIngredientLine(line).map((item) => ({
        ...item,
        name: toTitleCase(validateIngredientName(item.name).finalName),
        expiryDate: recommendExpiryDate(item.name, item.purchaseDate),
      })),
    [line],
  )

  const addPending = (name: string, source: Ingredient['source']) => {
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
        quantity: 1,
        unit: defaultUnitByName(validated.finalName),
        category: 'General',
        purchaseDate: today,
        expiryDate: recommendExpiryDate(validated.finalName, today),
        source,
      },
    ])
  }

  const applyBatch = () => {
    const parsed = parsedPreview.map((item) => {
      const validated = validateIngredientName(item.name)
      if (validated.flagged) {
        setValidationWarnings((prev) => [...prev, `"${item.name}" needs review before adding to fridge.`])
      }
      if (validated.correctedFrom) {
        setValidationWarnings((prev) => [...prev, `Auto-corrected "${validated.correctedFrom}" to "${toTitleCase(validated.finalName)}".`])
      }
      return {
        ...item,
        name: toTitleCase(validated.finalName),
        icon: '🥬',
        expiryDate: recommendExpiryDate(validated.finalName, item.purchaseDate),
      }
    })
    setPending((prev) => [...prev, ...parsed])
    // clear the input sentence and show a quick success indicator
    setLine('')
    setAddedFlag(true)
    window.setTimeout(() => setAddedFlag(false), 1500)
  }

  const applyToFridge = async () => {
    if (!authSession?.accessToken || isApplying) return

    setIsApplying(true)
    const persistedItems: Ingredient[] = []
    try {
      for (const item of pending) {
        try {
          const created = await createMyFridgeItem(authSession.accessToken, {
            ingredient: item.name,
            quantity: item.quantity,
            unit: item.unit,
            expiry_date: item.expiryDate,
            status: 'in_fridge',
            category: item.category,
          })
          persistedItems.push({
            ...item,
            id: created.id,
            name: created.ingredient,
            quantity: created.quantity,
            unit: created.unit,
            expiryDate: created.expiry_date,
            category: created.category ?? item.category,
          })
        } catch {
          // Skip failed row and continue processing others.
        }
      }

      setInventory((prev) => mergeIngredients(prev, persistedItems))
      setPending([])
      setSelectedAuto([])
      setQuickSelected([])
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
      <Card>
        <h1 className="hero-title text-5xl font-semibold">Ready to stock up, {user.nickname || 'there'}?</h1>
        <p className="mt-2 text-lg text-slate-600">Paste a list of ingredients and we'll extract quantities, names, and suggest expiry dates.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <textarea className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-lg transition-colors duration-150" rows={5} value={line} onChange={(e) => setLine(e.target.value)} />
          <div className="rounded-2xl border border-slate-300 bg-white/80 p-4">
            <p className="font-semibold">Ingredient Preview</p>
            <div className="mt-3 space-y-2">
              {parsedPreview.map((item) => (
                <p key={item.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">{item.quantity} {item.unit} {item.name} • Exp {item.expiryDate}</p>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button onClick={applyBatch}>Add Ingredients to Tray</Button>
          {addedFlag && <span className="text-green-600 font-semibold">Added!</span>}
        </div>
        {validationWarnings.length > 0 && (
          <div className="mt-4 space-y-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {validationWarnings.slice(-4).map((msg, idx) => <p key={`${msg}-${idx}`}>{msg}</p>)}
          </div>
        )}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-2xl font-semibold">Search Ingredients</h2>
          <div className="mt-3 flex items-center rounded-xl border border-slate-400 bg-white p-2">
            <input className="w-full bg-transparent p-1 outline-none" placeholder="Type ingredient..." value={query} onChange={(e) => setQuery(e.target.value)} />
            {query && <button className="rounded-full px-2 text-slate-500 hover:bg-slate-100" onClick={() => setQuery('')}>✕</button>}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((item) => (
              <button
                key={item}
                className={`rounded-full px-3 py-1 text-sm ${selectedAuto.includes(item) ? 'bg-slate-900 text-white' : 'bg-emerald-50 text-emerald-800'}`}
                onClick={() => {
                  setSelectedAuto((prev) => (prev.includes(item) ? prev : [...prev, item]))
                  setQuery(item)
                  addPending(item, 'autocomplete')
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="text-2xl font-semibold">Frequently used ingredients</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {frequent.map((name) => (
              <button
                key={name}
                className={`rounded-2xl border p-4 text-left ${quickSelected.includes(name) ? 'border-slate-900 bg-slate-900 text-white' : 'border-emerald-200'}`}
                onClick={() => {
                  if (!quickSelected.includes(name)) {
                    setQuickSelected((prev) => [...prev, name])
                    addPending(name, 'quick-add')
                  }
                }}
              >
                <p className="font-medium">{name}</p>
                <p className={`text-sm ${quickSelected.includes(name) ? 'text-slate-200' : 'text-slate-500'}`}>Quick add</p>
              </button>
            ))}
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
