import { useEffect, useState } from 'react'
import { SectionContainer } from '../components/ui/SectionContainer.tsx'
import { Card } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { getMyProfile, upsertMyProfile } from '../lib/backendApi.ts'
import { useAppState } from '../context/useAppState.ts'

const AGE_GROUPS = ['18-24', '25-34', '35-44', '45-54', '55+', 'Prefer not to say']
const DIETS: string[] = ['Omnivore', 'Vegetarian', 'Vegan', 'Pescatarian', 'Prefer not to say']

export function MyProfilePage() {
  const { authSession, user, setUser } = useAppState()

  const [nickname, setNickname] = useState<string>(user.nickname ?? '')
  const [ageGroup, setAgeGroup] = useState<string>(user.ageRange ?? AGE_GROUPS[1])
  const [dietary, setDietary] = useState<string>(user.dietaryPreference ?? DIETS[0])
  const [allergies, setAllergies] = useState<string>((user.allergies ?? []).join(', '))
  const [error, setError] = useState<string>('')
  const [saving, setSaving] = useState<boolean>(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Load current profile data on mount if available
  useEffect(() => {
    const load = async () => {
      if (!authSession?.accessToken) return
      try {
        const profile = await getMyProfile(authSession.accessToken)
        setNickname(profile.nickname ?? '')
        setAgeGroup(profile.age_group ?? AGE_GROUPS[1])
        setDietary(profile.diet ?? DIETS[0])
        setAllergies(profile.allergy ? profile.allergy.toString() : '')
      } catch {
        // Non-blocking: profile may not exist yet
      }
    }
    load()
  }, [authSession?.accessToken])

  const onSave = async () => {
    if (!authSession?.accessToken) {
      setError('Not authenticated')
      return
    }
    setSaving(true)
    setError('')
    setSaveSuccess(false)
    try {
      const payload = {
        nickname,
        age_group: ageGroup,
        diet: dietary,
        allergy: allergies
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .join(','),
      }
      await upsertMyProfile(authSession.accessToken, payload)
      // Update local user/profile state to reflect saved values
      setUser((prev) => ({
        ...prev,
        nickname,
        ageRange: ageGroup,
        dietaryPreference: dietary as typeof prev.dietaryPreference,
        allergies: allergies
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }))
      setSaveSuccess(true)
      window.setTimeout(() => setSaveSuccess(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionContainer>
      <Card>
        <h1 className="text-4xl font-semibold">My Profile</h1>
        <p className="mt-2 text-slate-600">Manage your personal details and dietary preferences.</p>
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Nickname</label>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-lg transition-colors duration-150"
              placeholder="Your nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Age Group</label>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-lg transition-colors duration-150"
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
            >
              {AGE_GROUPS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-600 mb-1">Dietary Preference</label>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-lg transition-colors duration-150"
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
            >
              {DIETS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-600 mb-1">Allergies (comma-separated)</label>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-lg transition-colors duration-150"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="peanuts, shellfish"
            />
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        {saveSuccess && <p className="mt-3 text-sm font-semibold text-emerald-700">Profile updated!</p>}
        <div className="mt-6">
          <Button loading={saving} loadingText="Saving..." onClick={onSave}>Save</Button>
        </div>
      </Card>
    </SectionContainer>
  )
}
