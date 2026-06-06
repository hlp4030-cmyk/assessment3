import { createContext, useEffect, useMemo, useRef, useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AuthSession, GoalState, Ingredient, Recipe, RewardState, UserProfile } from '../types/models.ts'
import { getMyProfile } from '../lib/backendApi.ts'

interface AppStateContextValue {
  isAuthenticated: boolean
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>
  authSession: AuthSession | null
  setAuthSession: Dispatch<SetStateAction<AuthSession | null>>
  user: UserProfile
  setUser: Dispatch<SetStateAction<UserProfile>>
  goals: GoalState
  setGoals: Dispatch<SetStateAction<GoalState>>
  rewards: RewardState
  setRewards: Dispatch<SetStateAction<RewardState>>
  inventory: Ingredient[]
  setInventory: Dispatch<SetStateAction<Ingredient[]>>
  selectedRecipe: Recipe | null
  setSelectedRecipe: Dispatch<SetStateAction<Recipe | null>>
  keepLoggedIn: boolean
  setKeepLoggedIn: Dispatch<SetStateAction<boolean>>
}

const defaultUser: UserProfile = {
  nickname: '',
  ageRange: '25-34',
  gender: 'Prefer not to say',
  dietaryPreference: 'Omnivore',
  allergies: [],
  onboardingComplete: false,
}

const defaultGoals: GoalState = {
  selectedGoals: {
    savings: true,
    environment: true,
    cooking: true,
  },
  weeklyMealsTarget: 5,
  monthlySavingsTargetAud: 180,
  wasteReductionTargetPercent: 25,
  mealsCookedThisWeek: 0,
  savingsThisMonthAud: 0,
  wasteReductionAchievedPercent: 0,
}

const defaultRewards: RewardState = {
  points: 0,
  streak: 0,
  milestone: 'Starter',
}

export const AppStateContext = createContext<AppStateContextValue | null>(null)

// Helper to read from the appropriate storage based on keepLoggedIn preference
function readStoredAuth(key: string, keepLoggedIn: boolean): string | null {
  if (keepLoggedIn) {
    return localStorage.getItem(key)
  }
  // When keepLoggedIn is false, prefer sessionStorage, fall back to localStorage
  // (handles the case where user previously logged in with keepLoggedIn=true)
  return sessionStorage.getItem(key) ?? localStorage.getItem(key)
}

export function AppProviders({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const sessionCheckDone = useRef(false)
  const [keepLoggedIn, setKeepLoggedIn] = useState(() => JSON.parse(localStorage.getItem('eatup-keep-logged-in') ?? 'false'))
  const [isAuthenticated, setIsAuthenticated] = useState(() => JSON.parse(readStoredAuth('eatup-auth', false) ?? 'false'))
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => JSON.parse(readStoredAuth('eatup-session', false) ?? 'null'))
  const [user, setUser] = useState<UserProfile>(() => JSON.parse(readStoredAuth('eatup-user', false) ?? 'null') ?? defaultUser)
  const [goals, setGoals] = useState<GoalState>(() => JSON.parse(readStoredAuth('eatup-goals', false) ?? 'null') ?? defaultGoals)
  const [rewards, setRewards] = useState<RewardState>(() => JSON.parse(readStoredAuth('eatup-rewards', false) ?? 'null') ?? defaultRewards)
  const [inventory, setInventory] = useState<Ingredient[]>(() => JSON.parse(readStoredAuth('eatup-inventory', false) ?? '[]'))
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(() => JSON.parse(sessionStorage.getItem('eatup-selected-recipe') ?? 'null'))

  const value = useMemo(
    () => ({
      isAuthenticated,
      setIsAuthenticated,
      authSession,
      setAuthSession,
      user,
      setUser,
      goals,
      setGoals,
      rewards,
      setRewards,
      inventory,
      setInventory,
      selectedRecipe,
      setSelectedRecipe,
      keepLoggedIn,
      setKeepLoggedIn,
    }),
    [isAuthenticated, authSession, user, goals, rewards, inventory, selectedRecipe, keepLoggedIn],
  )

  useEffect(() => {
    if (selectedRecipe) {
      sessionStorage.setItem('eatup-selected-recipe', JSON.stringify(selectedRecipe))
    } else {
      sessionStorage.removeItem('eatup-selected-recipe')
    }
  }, [selectedRecipe])

  // Persist keepLoggedIn preference (always in localStorage so it survives browser close)
  useEffect(() => {
    localStorage.setItem('eatup-keep-logged-in', JSON.stringify(keepLoggedIn))
  }, [keepLoggedIn])

  useEffect(() => {
    if (!isAuthenticated) {
      // When signed out, wipe all persisted data from both storages.
      localStorage.removeItem('eatup-auth')
      localStorage.removeItem('eatup-session')
      localStorage.removeItem('eatup-user')
      localStorage.removeItem('eatup-goals')
      localStorage.removeItem('eatup-rewards')
      localStorage.removeItem('eatup-inventory')
      sessionStorage.removeItem('eatup-auth')
      sessionStorage.removeItem('eatup-session')
      sessionStorage.removeItem('eatup-user')
      sessionStorage.removeItem('eatup-goals')
      sessionStorage.removeItem('eatup-rewards')
      sessionStorage.removeItem('eatup-inventory')
      return
    }

    const keys = ['eatup-auth', 'eatup-session', 'eatup-user', 'eatup-goals', 'eatup-rewards', 'eatup-inventory']
    const values = [isAuthenticated, authSession, user, goals, rewards, inventory]

    if (keepLoggedIn) {
      // Persist to localStorage (survives browser close)
      keys.forEach((key, i) => localStorage.setItem(key, JSON.stringify(values[i])))
      // Clean up sessionStorage
      keys.forEach((key) => sessionStorage.removeItem(key))
    } else {
      // Persist to sessionStorage (cleared on browser close)
      keys.forEach((key, i) => sessionStorage.setItem(key, JSON.stringify(values[i])))
      // Clean up localStorage auth data
      keys.forEach((key) => localStorage.removeItem(key))
    }
  }, [isAuthenticated, authSession, user, goals, rewards, inventory, keepLoggedIn])

  // ── Session validity check on mount ──
  // Check both localStorage and sessionStorage for an existing session.
  // If found, verify the token is still valid by making a lightweight API call.
  // If it fails, clean up and redirect to login.
  useEffect(() => {
    if (sessionCheckDone.current) return
    sessionCheckDone.current = true

    const checkSession = async () => {
      // Check both storage locations for an existing session
      const lsAuth = JSON.parse(localStorage.getItem('eatup-auth') ?? 'false') as boolean
      const ssAuth = JSON.parse(sessionStorage.getItem('eatup-auth') ?? 'false') as boolean
      const storedAuth = lsAuth || ssAuth

      const storedSession = lsAuth
        ? (JSON.parse(localStorage.getItem('eatup-session') ?? 'null') as AuthSession | null)
        : (JSON.parse(sessionStorage.getItem('eatup-session') ?? 'null') as AuthSession | null)
      if (!storedAuth || !storedSession?.accessToken) return

      try {
        await getMyProfile(storedSession.accessToken)
      } catch {
        // Token is expired or invalid — perform a clean logout
        sessionStorage.setItem('eatup-session-expired', 'true')
        setIsAuthenticated(false)
        setAuthSession(null)
        setUser(defaultUser)
        setGoals(defaultGoals)
        setRewards(defaultRewards)
        setInventory([])
        navigate('/login', { replace: true })
      }
    }

    void checkSession()
  }, [navigate, setIsAuthenticated, setAuthSession, setUser, setGoals, setRewards, setInventory])

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}
