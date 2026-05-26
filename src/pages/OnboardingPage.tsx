import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../context/useAppState.ts'
import { upsertMyProfile } from '../lib/backendApi.ts'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { SectionContainer } from '../components/ui/SectionContainer.tsx'

export function OnboardingPage() {
  const navigate = useNavigate()
  const { user, setUser, authSession } = useAppState()
  const [nickname, setNickname] = useState(user.nickname)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const ageOptions = ['18-24', '25-34', '35-44', '45-54', '55+', 'Prefer not to say']
  const dietOptions = ['Omnivore', 'Vegetarian', 'Vegan', 'Pescatarian', 'Prefer not to say']

  return (
    <SectionContainer>
      <Card>
        <h1 className="text-5xl font-semibold tracking-tight">Let’s personalise your kitchen</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <input className="rounded-2xl border border-slate-400 bg-white p-4 text-lg" placeholder="Nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} />

          <div>
            <p className="mb-2 text-sm font-medium text-slate-600">Diet</p>
            <select className="w-full rounded-2xl border border-slate-400 bg-white p-4 text-lg" value={user.dietaryPreference} onChange={(e) => setUser({ ...user, dietaryPreference: e.target.value as typeof user.dietaryPreference })}>
              {dietOptions.map((d) => <option key={d}>{d}</option>)}
            </select>
            <button className="mt-2 text-sm text-slate-500 underline" onClick={() => setUser({ ...user, dietaryPreference: 'Prefer not to say' as typeof user.dietaryPreference })}>Prefer not to say</button>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-600">Allergies</p>
            <input className="w-full rounded-2xl border border-slate-400 bg-white p-4 text-lg" placeholder="Comma separated (optional)" onBlur={(e) => setUser({ ...user, allergies: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} />
            <button className="mt-2 text-sm text-slate-500 underline" onClick={() => setUser({ ...user, allergies: [] })}>Prefer not to say</button>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-600">Age</p>
            <select className="w-full rounded-2xl border border-slate-400 bg-white p-4 text-lg" value={user.ageRange} onChange={(e) => setUser({ ...user, ageRange: e.target.value })}>
              {ageOptions.map((age) => <option key={age}>{age}</option>)}
            </select>
            <button className="mt-2 text-sm text-slate-500 underline" onClick={() => setUser({ ...user, ageRange: 'Prefer not to say' })}>Prefer not to say</button>
          </div>
        </div>
        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
        <div className="mt-8"><Button disabled={isSubmitting} onClick={async () => {
          setError('')
          if (!authSession?.accessToken) {
            setError('Your session has expired. Please log in again.')
            return
          }

          try {
            setIsSubmitting(true)
            const payload = {
              nickname: nickname.trim() || null,
              age_group: user.ageRange,
              diet: user.dietaryPreference,
              allergy: user.allergies.join(', '),
              goal_cooking: 0,
              goal_savings: 0,
              goal_co2e: 0,
            }
            const saved = await upsertMyProfile(authSession.accessToken, payload)
            setUser({
              ...user,
              nickname: saved.nickname ?? nickname,
              ageRange: saved.age_group ?? user.ageRange,
              dietaryPreference: (saved.diet as typeof user.dietaryPreference | null) ?? user.dietaryPreference,
              allergies: saved.allergy ? saved.allergy.split(',').map((x) => x.trim()).filter(Boolean) : user.allergies,
              onboardingComplete: Boolean(saved.created_at),
            })
            navigate('/goals')
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save profile.')
          } finally {
            setIsSubmitting(false)
          }
        }}>{isSubmitting ? 'Saving...' : 'Next: Goals'}</Button></div>
      </Card>
    </SectionContainer>
  )
}
