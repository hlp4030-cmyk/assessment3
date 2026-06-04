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

export function AppProviders({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const sessionCheckDone = useRef(false)
  const [isAuthenticated, setIsAuthenticated] = useState(() => JSON.parse(localStorage.getItem('eatup-auth') ?? 'false'))
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => JSON.parse(localStorage.getItem('eatup-session') ?? 'null'))
  const [user, setUser] = useState<UserProfile>(() => JSON.parse(localStorage.getItem('eatup-user') ?? 'null') ?? defaultUser)
  const [goals, setGoals] = useState<GoalState>(() => JSON.parse(localStorage.getItem('eatup-goals') ?? 'null') ?? defaultGoals)
  const [rewards, setRewards] = useState<RewardState>(() => JSON.parse(localStorage.getItem('eatup-rewards') ?? 'null') ?? defaultRewards)
  const [inventory, setInventory] = useState<Ingredient[]>(() => JSON.parse(localStorage.getItem('eatup-inventory') ?? '[]'))
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
    }),
    [isAuthenticated, authSession, user, goals, rewards, inventory, selectedRecipe],
  )

  useEffect(() => {
    if (selectedRecipe) {
      sessionStorage.setItem('eatup-selected-recipe', JSON.stringify(selectedRecipe))
    } else {
      sessionStorage.removeItem('eatup-selected-recipe')
    }
  }, [selectedRecipe])

  useEffect(() => {
    if (!isAuthenticated) {
      // When signed out, wipe all persisted data to prevent stale restore on back-nav.
      localStorage.removeItem('eatup-auth')
      localStorage.removeItem('eatup-session')
      localStorage.removeItem('eatup-user')
      localStorage.removeItem('eatup-goals')
      localStorage.removeItem('eatup-rewards')
      localStorage.removeItem('eatup-inventory')
      return
    }
    localStorage.setItem('eatup-auth', JSON.stringify(isAuthenticated))
    localStorage.setItem('eatup-session', JSON.stringify(authSession))
    localStorage.setItem('eatup-user', JSON.stringify(user))
    localStorage.setItem('eatup-goals', JSON.stringify(goals))
    localStorage.setItem('eatup-rewards', JSON.stringify(rewards))
    localStorage.setItem('eatup-inventory', JSON.stringify(inventory))
  }, [isAuthenticated, authSession, user, goals, rewards, inventory])

  // ── Session validity check on mount ──
  // If localStorage says we're authenticated, verify the token is still valid
  // by making a lightweight API call. If it fails, clean up and redirect to login.
  useEffect(() => {
    if (sessionCheckDone.current) return
    sessionCheckDone.current = true

    const checkSession = async () => {
      // Only check if localStorage says authenticated and we have a token
      const storedAuth = JSON.parse(localStorage.getItem('eatup-auth') ?? 'false') as boolean
      const storedSession = JSON.parse(localStorage.getItem('eatup-session') ?? 'null') as AuthSession | null
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
