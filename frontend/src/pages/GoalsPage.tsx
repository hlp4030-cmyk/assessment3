import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAppState } from '../context/useAppState.ts'
import { upsertMyProfile } from '../lib/backendApi.ts'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { SectionContainer } from '../components/ui/SectionContainer.tsx'
import { ToggleCard } from '../components/ui/ToggleCard.tsx'

export function GoalsPage() {
  const { goals, setGoals, user, setUser, authSession } = useAppState()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const cards = [
    { key: 'savings', title: 'Savings Goal', icon: '💵', desc: 'Save more each month (AUD).' },
    { key: 'environment', title: 'Environment Goal', icon: '🍃', desc: 'Reduce avoidable food waste.' },
    { key: 'cooking', title: 'Cooking Goal', icon: '👩‍🍳', desc: 'Cook consistently each week.' },
  ] as const

  return (
    <SectionContainer>
      <Card>
        <h1 className="text-5xl font-semibold tracking-tight">Hi, {user.nickname || 'there'}, what is your goal?</h1>
        <p className="mt-3 text-lg text-slate-600">Select goals to track your progress.</p>
      </Card>
      <div className="grid gap-6 lg:grid-cols-3">
        {cards.map((card) => {
          const active = goals.selectedGoals[card.key]
          return (
            <ToggleCard
              key={card.key}
              title={card.title}
              subtitle={card.desc}
              icon={card.icon}
              active={active}
              onClick={() => setGoals({ ...goals, selectedGoals: { ...goals.selectedGoals, [card.key]: !active } })}
            />
          )
        })}
      </div>
      <Card>
        <div className="flex flex-wrap gap-3">
          <Button
            loading={isSubmitting}
            loadingText="Saving..."
            onClick={async () => {
              if (!authSession?.accessToken) return

              try {
                setIsSubmitting(true)
                await upsertMyProfile(authSession.accessToken, {
                  goal_cooking: 0,
                  goal_savings: 0,
                  goal_co2e: 0,
                })
              } catch {
                // Non-blocking: keep UX moving even if profile update fails.
              } finally {
                setIsSubmitting(false)
              }

              setUser({ ...user, onboardingComplete: true })
              navigate('/my-fridge')
            }}
          >Finish Onboarding</Button>
        </div>
      </Card>
    </SectionContainer>
  )
}
