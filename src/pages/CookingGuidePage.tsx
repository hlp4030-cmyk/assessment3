import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../context/useAppState.ts'
import { Button } from '../components/ui/Button.tsx'

export function CookingGuidePage() {
  const { selectedRecipe } = useAppState()
  const navigate = useNavigate()
  const [done, setDone] = useState<boolean[]>([])

  const allChecked = selectedRecipe ? done.filter(Boolean).length === selectedRecipe.steps.length : false
  const selectAll = () => {
    if (!selectedRecipe) return
    setDone(selectedRecipe.steps.map(() => true))
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
      <h2 className="mt-2 text-2xl font-semibold text-emerald-700">{selectedRecipe.name}</h2>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Required ingredients</p>
        <ul className="mt-2 space-y-1 text-slate-700">
          {selectedRecipe.required.map((req) => (
            <li key={req.name}>{req.quantity || 0} {req.unit || 'ea'} {req.name || 'Unknown ingredient'}</li>
          ))}
        </ul>
      </div>
      <p className="mt-2 text-slate-600">Progress: {done.filter(Boolean).length}/{selectedRecipe.steps.length} steps complete</p>
      {!allChecked && (
        <button
          className="mt-3 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
          onClick={selectAll}
        >
          Select All Steps
        </button>
      )}
      <ol className="mt-6 space-y-3">
        {selectedRecipe.steps.map((step, idx) => (
          <li key={step} className="flex items-center gap-3 rounded-2xl border border-emerald-100 p-4">
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
