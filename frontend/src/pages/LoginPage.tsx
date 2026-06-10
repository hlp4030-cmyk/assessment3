import { useEffect, useState, useCallback } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppState } from '../context/useAppState.ts'
import { getMyProfile, login } from '../lib/backendApi.ts'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { SectionContainer } from '../components/ui/SectionContainer.tsx'
import { PrivacyPolicyModal } from '../components/ui/PrivacyPolicyModal.tsx'

export function LoginPage() {
  const navigate = useNavigate()
  const { setIsAuthenticated, setAuthSession, setUser, setGoals, setKeepLoggedIn } = useAppState()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [keepLoggedInChecked, setKeepLoggedInChecked] = useState(false)
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({})
  const [sessionExpired, setSessionExpired] = useState(false)
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false)

  const handleOpenPrivacy = useCallback(() => setShowPrivacyPolicy(true), [])
  const handleClosePrivacy = useCallback(() => setShowPrivacyPolicy(false), [])

  // Check for session expiry flag set by AppProviders
  useEffect(() => {
    if (sessionStorage.getItem('eatup-session-expired') === 'true') {
      setSessionExpired(true)
      sessionStorage.removeItem('eatup-session-expired')
    }
  }, [])

  const emailValid = /\S+@\S+\.\S+/.test(email)
  const passwordValid = password.length >= 6

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (!emailValid || !passwordValid) {
      setError('Please enter a valid email and password (minimum 6 characters).')
      return
    }

    try {
      setIsSubmitting(true)
      const result = await login({ email: email.trim().toLowerCase(), password })

      if (!result.access_token || !result.refresh_token) {
        throw new Error('Login succeeded but tokens were missing.')
      }

      const backendUser = result.user
      setAuthSession({
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
        email: backendUser?.email,
        supabaseUserId: backendUser?.id,
      })

      setUser((prev) => ({
        ...prev,
        email: backendUser?.email ?? prev.email,
        supabaseUserId: backendUser?.id ?? prev.supabaseUserId,
      }))

      try {
        const profile = await getMyProfile(result.access_token)
        setUser((prev) => ({
          ...prev,
          nickname: profile.nickname ?? prev.nickname,
          ageRange: profile.age_group ?? prev.ageRange,
          dietaryPreference: (profile.diet as typeof prev.dietaryPreference | null) ?? prev.dietaryPreference,
          allergies: profile.allergy ? profile.allergy.split(',').map((x) => x.trim()).filter(Boolean) : prev.allergies,
          onboardingComplete: Boolean(profile.created_at),
          email: backendUser?.email ?? prev.email,
          supabaseUserId: backendUser?.id ?? prev.supabaseUserId,
        }))

        setGoals((prev) => ({
          ...prev,
          mealsCookedThisWeek: profile.goal_cooking ?? 0,
          savingsThisMonthAud: profile.goal_savings ?? 0,
          wasteReductionAchievedPercent: profile.goal_co2e ?? 0,
        }))
      } catch {
        // Non-blocking: profile may not exist yet. User still proceeds to app.
      }

      setKeepLoggedIn(keepLoggedInChecked)
      setIsAuthenticated(true)

      // Returning user flow: go directly to MyFridge.
      navigate('/my-fridge')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SectionContainer>
      <div className="max-w-[420px] mx-auto">
      <Card>
        <div className="flex gap-3 mb-8">
          <button
            type="button"
            className="flex-1 rounded-full bg-slate-800 px-6 py-3.5 text-base font-semibold text-white shadow-md transition-all duration-200"
          >
            Login
          </button>
          <button
            type="button"
            className="flex-1 rounded-full bg-transparent px-6 py-3.5 text-base font-medium text-slate-500 transition-all duration-200 hover:bg-slate-50 hover:text-slate-700"
            onClick={() => navigate('/signup')}
          >
            Sign Up
          </button>
        </div>
        <h1 className="text-5xl font-semibold tracking-tight">Login</h1>
        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <input
              className={`w-full rounded-2xl border bg-slate-50 p-4 text-lg ${touched.email ? (emailValid ? 'border-emerald-400' : 'border-rose-400') : 'border-slate-200'}`}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
            />
            {touched.email && !emailValid && email.length > 0 && <p className="mt-1 text-sm text-rose-500">Please enter a valid email address.</p>}
            {touched.email && emailValid && <p className="mt-1 text-sm text-emerald-600">✓ Valid email</p>}
          </div>
          <div>
            <div className="relative">
              <input
                className={`w-full rounded-2xl border bg-slate-50 p-4 pr-12 text-lg ${touched.password ? (passwordValid ? 'border-emerald-400' : 'border-rose-400') : 'border-slate-200'}`}
                type={showPassword ? 'text' : 'password'}
                placeholder="Password (min 6 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-150"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  {showPassword ? (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </>
                  ) : (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </>
                  )}
                </svg>
              </button>
            </div>
            {touched.password && !passwordValid && password.length > 0 && <p className="mt-1 text-sm text-rose-500">Password must be at least 6 characters.</p>}
            {touched.password && passwordValid && <p className="mt-1 text-sm text-emerald-600">✓ Password meets requirements</p>}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={keepLoggedInChecked}
              onChange={(e) => setKeepLoggedInChecked(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Keep me logged in
          </label>
          {sessionExpired && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-700">For your security, please log in again to continue.</p>
            </div>
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button full disabled={isSubmitting}>{isSubmitting ? 'Signing in...' : 'Continue'}</Button>
        </form>
      <Link to="/welcome" className="mt-4 inline-block"><Button variant="ghost">Back</Button></Link>
        <p className="mt-4 text-center text-sm text-slate-500">
          By continuing, you agree to our{' '}
          <button type="button" onClick={handleOpenPrivacy} className="font-medium text-emerald-600 underline underline-offset-2 hover:text-emerald-700 transition-colors duration-150">
            Privacy and Policy
          </button>
        </p>
      </Card>
      <PrivacyPolicyModal isOpen={showPrivacyPolicy} onClose={handleClosePrivacy} />
      </div>
    </SectionContainer>
  )
}