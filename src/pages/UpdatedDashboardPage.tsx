import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useAppState } from '../context/useAppState.ts'
import { getMyProfile } from '../lib/backendApi.ts'
import { formatCurrencyAU } from '../utils/formatters.ts'
import { Card } from '../components/ui/Card.tsx'
import { ProgressBar } from '../components/ui/ProgressBar.tsx'
import { SectionContainer } from '../components/ui/SectionContainer.tsx'
import { Button } from '../components/ui/Button.tsx'

export function UpdatedDashboardPage() {
  const { goals, inventory, user, setGoals, authSession } = useAppState()
  const [profileProgress, setProfileProgress] = useState({
    goalCooking: 0,
    goalSavings: 0,
    goalCo2e: 0,
  })

  useEffect(() => {
    const run = async () => {
      if (!authSession?.accessToken) return
      try {
        const profile = await getMyProfile(authSession.accessToken)
        setProfileProgress({
          goalCooking: profile.goal_cooking ?? 0,
          goalSavings: profile.goal_savings ?? 0,
          goalCo2e: profile.goal_co2e ?? 0,
        })
      } catch {
        // Non-blocking: keep dashboard visible if profile fetch fails.
      }
    }
    void run()
  }, [authSession?.accessToken])

  const cookingProgress = useMemo(
    () => Math.min(100, Math.round((profileProgress.goalCooking / Math.max(1, goals.weeklyMealsTarget)) * 100)),
    [profileProgress.goalCooking, goals.weeklyMealsTarget],
  )
  const savingsProgress = useMemo(
    () => Math.min(100, Math.round((profileProgress.goalSavings / Math.max(1, goals.monthlySavingsTargetAud)) * 100)),
    [profileProgress.goalSavings, goals.monthlySavingsTargetAud],
  )
  const environmentProgress = useMemo(
    () => Math.min(100, Math.round((profileProgress.goalCo2e / Math.max(1, goals.wasteReductionTargetPercent)) * 100)),
    [profileProgress.goalCo2e, goals.wasteReductionTargetPercent],
  )

  return (
    <SectionContainer>
      <Card>
        <h1 className="hero-title text-5xl font-semibold">Keep it up, {user.nickname || 'there'}!</h1>
        <p className="mt-2 text-slate-600">You’re building great habits — keep the virtuous cycle going.</p>
      </Card>
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-semibold">Edit goals:</p>
          <button className={`rounded-full border px-3 py-1 ${goals.selectedGoals.cooking ? 'border-emerald-500 bg-emerald-100 text-emerald-800' : 'border-slate-300 bg-slate-100 text-slate-500'}`} onClick={() => setGoals((prev) => ({ ...prev, selectedGoals: { ...prev.selectedGoals, cooking: !prev.selectedGoals.cooking } }))}>👩‍🍳 Cooking</button>
          <button className={`rounded-full border px-3 py-1 ${goals.selectedGoals.savings ? 'border-emerald-500 bg-emerald-100 text-emerald-800' : 'border-slate-300 bg-slate-100 text-slate-500'}`} onClick={() => setGoals((prev) => ({ ...prev, selectedGoals: { ...prev.selectedGoals, savings: !prev.selectedGoals.savings } }))}>💵 Savings</button>
          <button className={`rounded-full border px-3 py-1 ${goals.selectedGoals.environment ? 'border-emerald-500 bg-emerald-100 text-emerald-800' : 'border-slate-300 bg-slate-100 text-slate-500'}`} onClick={() => setGoals((prev) => ({ ...prev, selectedGoals: { ...prev.selectedGoals, environment: !prev.selectedGoals.environment } }))}>🍃 Environment</button>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        {goals.selectedGoals.cooking && <Card>
          <p className="text-xl">👩‍🍳</p>
          <p className="text-sm text-slate-500">Meals cooked this week</p>
          <p className="mt-2 text-3xl font-semibold">{profileProgress.goalCooking}/{goals.weeklyMealsTarget}</p>
          <div className="mt-3"><ProgressBar value={cookingProgress} /></div>
        </Card>}
        {goals.selectedGoals.savings && <Card>
          <p className="text-xl">💵</p>
          <p className="text-sm text-slate-500">Savings this month</p>
          <p className="mt-2 text-3xl font-semibold">{formatCurrencyAU(profileProgress.goalSavings)}</p>
          <div className="mt-3"><ProgressBar value={savingsProgress} /></div>
        </Card>}
        {goals.selectedGoals.environment && <Card>
          <p className="text-xl">🍃</p>
          <p className="text-sm text-slate-500">Carbon emission reduced</p>
          <p className="mt-2 text-3xl font-semibold">{profileProgress.goalCo2e.toFixed(2)} kg CO2e</p>
          <div className="mt-3"><ProgressBar value={environmentProgress} /></div>
        </Card>}
      </div>
      <Card>
        <p className="text-slate-600">Inventory items remaining: {inventory.length}</p>
      </Card>
      <div className="flex gap-3">
        <Link to="/meal-suggestions"><Button>Cook next dish</Button></Link>
        <Link to="/my-fridge"><Button variant="secondary">My Fridge</Button></Link>
      </div>
    </SectionContainer>
  )
}
