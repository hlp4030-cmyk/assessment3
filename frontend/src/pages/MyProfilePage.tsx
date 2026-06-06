import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SectionContainer } from '../components/ui/SectionContainer.tsx'
import { Card } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { deleteAccount, getMyProfile, upsertMyProfile } from '../lib/backendApi.ts'
import { useAppState } from '../context/useAppState.ts'

const AGE_GROUPS = ['18-24', '25-34', '35-44', '45-54', '55+', 'Prefer not to say']
const DIETS: string[] = ['Omnivore', 'Vegetarian', 'Vegan', 'Pescatarian', 'Prefer not to say']

export function MyProfilePage() {
  const navigate = useNavigate()
  const { authSession, user, setUser, setIsAuthenticated, setAuthSession } = useAppState()

  const [nickname, setNickname] = useState<string>(user.nickname ?? '')
  const [ageGroup, setAgeGroup] = useState<string>(user.ageRange ?? AGE_GROUPS[1])
  const [dietary, setDietary] = useState<string>(user.dietaryPreference ?? DIETS[0])
  const [allergies, setAllergies] = useState<string>((user.allergies ?? []).join(', '))
  const [error, setError] = useState<string>('')
  const [saving, setSaving] = useState<boolean>(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string>('')

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

  const onDelete = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete your account? This action cannot be undone.'
    )
    if (!confirmed) return

    if (!authSession?.accessToken) {
      setDeleteError('Not authenticated')
      return
    }

    setDeleting(true)
    setDeleteError('')
    try {
      await deleteAccount(authSession.accessToken)
      // Clear all local auth state
      setIsAuthenticated(false)
      setAuthSession(null)
      setUser({
        nickname: '',
        ageRange: '25-34',
        gender: 'Prefer not to say',
        dietaryPreference: 'Omnivore',
        allergies: [],
        onboardingComplete: false,
      })
      navigate('/', { replace: true })
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account')
    } finally {
      setDeleting(false)
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
        {/* Danger Zone */}
        <div className="mt-10 border-t border-slate-200 pt-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Security & Privacy</h2>
          <p className="mt-1 text-sm text-slate-500">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          {deleteError && <p className="mt-2 text-sm text-rose-600">{deleteError}</p>}
          <button
            type="button"
            disabled={deleting}
            onClick={onDelete}
            className="mt-3 rounded-full px-6 py-3 text-base font-medium tracking-tight text-white bg-red-600 shadow-sm transition-all duration-200 hover:bg-red-700 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {deleting ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </Card>
    </SectionContainer>
  )
}
