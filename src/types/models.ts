export type DietaryPreference = 'Omnivore' | 'Vegetarian' | 'Vegan' | 'Pescatarian' | 'Prefer not to say'

export type ExpiryUrgency = 'fresh' | 'soon' | 'urgent' | 'expired'

export interface UserProfile {
  nickname: string
  ageRange: string
  gender: string
  dietaryPreference: DietaryPreference
  allergies: string[]
  onboardingComplete: boolean
  email?: string
  supabaseUserId?: string
}

export interface AuthSession {
  accessToken: string
  refreshToken: string
  email?: string
  supabaseUserId?: string
}

export interface Ingredient {
  id: string
  name: string
  icon: string
  quantity: number
  unit: string
  category: string
  purchaseDate: string
  expiryDate: string
  source: 'manual' | 'single-line' | 'quick-add' | 'autocomplete'
}

export interface GoalState {
  selectedGoals: {
    savings: boolean
    environment: boolean
    cooking: boolean
  }
  weeklyMealsTarget: number
  monthlySavingsTargetAud: number
  wasteReductionTargetPercent: number
  mealsCookedThisWeek: number
  savingsThisMonthAud: number
  wasteReductionAchievedPercent: number
}

export interface RewardState {
  points: number
  streak: number
  milestone: string
}

export interface Recipe {
  id: string
  name: string
  image: string
  timeMinutes: number
  required: Array<{ name: string; quantity: number; unit: string }>
  steps: string[]
}
