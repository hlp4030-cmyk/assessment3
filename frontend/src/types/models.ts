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


// ---------------------------------------------------------------------------
// DB-aligned master-data types (fetched from Supabase via backend)
// ---------------------------------------------------------------------------

export interface DbIngredient {
  id: string
  name: string
  category: string // 'vegetables' | 'fruits' | 'meat' | 'seafood' | 'dairy' | 'grains'
  standard_unit: string
  default_shelf_life_days: number
  default_quantity: number
  image_url?: string | null
  approx_price?: number | null
  co2_index?: number | null
}

export interface RecipeIngredientItem {
  id: string // ingredient ID (e.g. "i002")
  name: string // resolved ingredient name
  quantity: number // from JSONB "qty"
  unit: string
}

export interface DbRecipe {
  recipe_id: string
  title: string
  description?: string | null
  cooking_time_mins: number
  image_url?: string | null
  required_ingredients: RecipeIngredientItem[]
  steps: string[] // pre-parsed by backend from "|"-delimited instructions
  meal_type: string
}
