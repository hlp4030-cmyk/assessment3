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
  category: string
  standard_unit?: string
  default_shelf_life_days?: number
  default_quantity?: number
  image_url?: string
  expiration_date?: string
  meal_type?: string
  icon: string
  quantity: number
  unit: string
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
  recipe_id?: string
  title?: string
  description?: string
  cooking_time_mins?: number
  image_url?: string
  required_ingredients?: Array<{ id: string; qty: number; unit: string }>
  instructions?: string
  id: string
  name: string
  image: string
  timeMinutes: number
  required: Array<{ name: string; quantity: number; unit: string }>
  steps: string[]
}
