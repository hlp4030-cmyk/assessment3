import type { DbIngredient, DbRecipe } from '../types/models'

const BACKEND_BASE_URL = import.meta.env.VITE_API_URL ?? ''

export type SignupPayload = {
  email: string
  password: string
}

export type LoginPayload = {
  email: string
  password: string
}

export type AuthResponse = {
  access_token?: string
  refresh_token?: string
  user?: {
    id?: string
    email?: string
    user_metadata?: {
      full_name?: string
    }
    [key: string]: unknown
  }
  raw?: Record<string, unknown>
}

export type ProfileResponse = {
  id?: string
  created_at?: string
  nickname?: string | null
  age_group?: string | null
  diet?: string | null
  allergy?: string | null
  goal_cooking?: number | null
  goal_savings?: number | null
  goal_co2e?: number | null
}

export type ProfileUpdatePayload = Partial<Omit<ProfileResponse, 'id' | 'created_at'>>

export type FridgeItemResponse = {
  id: string
  created_at?: string
  user_id: string
  ingredient: string
  quantity: number
  unit: string
  expiry_date: string
  status?: string | null
  category?: string | null
}

export type FridgeItemCreatePayload = {
  ingredient: string
  quantity: number
  unit: string
  expiry_date: string
  status?: string
  category?: string
}

export type FridgeItemUpdatePayload = Partial<FridgeItemCreatePayload>

export type CookItemPayload = {
  item_id: string
  quantity_used: number
}

export type CookPayload = {
  recipe_name: string
  items: CookItemPayload[]
}

export type CookResponse = {
  updated_items: FridgeItemResponse[]
  used_item_ids: string[]
  profile: ProfileResponse
  meals_cooked: number
  savings_delta: number
  co2e_delta: number
}

export type WasteResponse = {
  item: FridgeItemResponse
  profile: ProfileResponse
  savings_penalty: number
  co2e_penalty: number
}

function extractErrorMessage(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as unknown
    if (typeof first === 'string') return first
    if (typeof first === 'object' && first !== null) {
      if ('msg' in first) return String((first as { msg?: unknown }).msg ?? fallback)
      if ('message' in first) return String((first as { message?: unknown }).message ?? fallback)
    }
  }

  if (typeof detail === 'object' && detail !== null) {
    if ('message' in detail) return String((detail as { message?: unknown }).message ?? fallback)
    if ('msg' in detail) return String((detail as { msg?: unknown }).msg ?? fallback)
    if ('hint' in detail) return String((detail as { hint?: unknown }).hint ?? fallback)
    return JSON.stringify(detail)
  }

  return fallback
}

async function parseResponse(response: Response): Promise<AuthResponse> {
  const data = (await response.json()) as AuthResponse | { detail?: unknown }

  if (!response.ok) {
    const detail = (data as { detail?: unknown }).detail
    const message =
      typeof detail === 'string'
        ? detail
        : typeof detail === 'object' && detail !== null && 'msg' in detail
          ? String((detail as { msg?: unknown }).msg ?? 'Request failed')
          : 'Request failed'
    throw new Error(message)
  }

  return data as AuthResponse
}

export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  const response = await fetch(`${BACKEND_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return parseResponse(response)
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const response = await fetch(`${BACKEND_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return parseResponse(response)
}

export async function getMyProfile(accessToken: string): Promise<ProfileResponse> {
  const response = await fetch(`${BACKEND_BASE_URL}/profile/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = (await response.json()) as ProfileResponse | { detail?: unknown }
  if (!response.ok) {
    throw new Error(extractErrorMessage((data as { detail?: unknown }).detail, 'Failed to fetch profile'))
  }
  return data as ProfileResponse
}

export async function upsertMyProfile(accessToken: string, payload: ProfileUpdatePayload): Promise<ProfileResponse> {
  const response = await fetch(`${BACKEND_BASE_URL}/profile/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })

  const data = (await response.json()) as ProfileResponse | { detail?: unknown }
  if (!response.ok) {
    throw new Error(extractErrorMessage((data as { detail?: unknown }).detail, 'Failed to save profile'))
  }
  return data as ProfileResponse
}

export async function getMyFridgeItems(accessToken: string): Promise<FridgeItemResponse[]> {
  const response = await fetch(`${BACKEND_BASE_URL}/fridge/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = (await response.json()) as FridgeItemResponse[] | { detail?: unknown }
  if (!response.ok) {
    throw new Error(extractErrorMessage((data as { detail?: unknown }).detail, 'Failed to fetch fridge items'))
  }
  return data as FridgeItemResponse[]
}

export async function createMyFridgeItem(accessToken: string, payload: FridgeItemCreatePayload): Promise<FridgeItemResponse> {
  const response = await fetch(`${BACKEND_BASE_URL}/fridge/me`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })

  const data = (await response.json()) as FridgeItemResponse | { detail?: unknown }
  if (!response.ok) {
    throw new Error(extractErrorMessage((data as { detail?: unknown }).detail, 'Failed to create fridge item'))
  }
  return data as FridgeItemResponse
}

export async function updateMyFridgeItem(accessToken: string, itemId: string, payload: FridgeItemUpdatePayload): Promise<FridgeItemResponse> {
  const response = await fetch(`${BACKEND_BASE_URL}/fridge/me/${itemId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })

  const data = (await response.json()) as FridgeItemResponse | { detail?: unknown }
  if (!response.ok) {
    throw new Error(extractErrorMessage((data as { detail?: unknown }).detail, 'Failed to update fridge item'))
  }
  return data as FridgeItemResponse
}

export async function deleteMyFridgeItem(accessToken: string, itemId: string): Promise<void> {
  const response = await fetch(`${BACKEND_BASE_URL}/fridge/me/${itemId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = (await response.json()) as { status?: string; detail?: unknown }
  if (!response.ok) {
    throw new Error(extractErrorMessage(data.detail, 'Failed to delete fridge item'))
  }
}

export async function cookRecipe(accessToken: string, payload: CookPayload): Promise<CookResponse> {
  const response = await fetch(`${BACKEND_BASE_URL}/fridge/me/cook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })

  const data = (await response.json()) as CookResponse | { detail?: unknown }
  if (!response.ok) {
    throw new Error(extractErrorMessage((data as { detail?: unknown }).detail, 'Failed to process recipe'))
  }
  return data as CookResponse
}

// ── Quick Add Settings API ──

export type QuickAddSettingResponse = {
  id: string
  user_id: string
  ingredient_name: string
  default_quantity: number
  unit: string
}

export type QuickAddSettingUpsertPayload = {
  ingredient_name: string
  default_quantity: number
  unit: string
}

export async function getQuickAddSettings(accessToken: string): Promise<QuickAddSettingResponse[]> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/quick-add/settings`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const data = (await response.json()) as QuickAddSettingResponse[] | { detail?: unknown }
  if (!response.ok) {
    throw new Error(extractErrorMessage((data as { detail?: unknown }).detail, 'Failed to fetch quick add settings'))
  }
  return data as QuickAddSettingResponse[]
}

export async function upsertQuickAddSetting(accessToken: string, payload: QuickAddSettingUpsertPayload): Promise<QuickAddSettingResponse> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/quick-add/settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })

  const data = (await response.json()) as QuickAddSettingResponse | { detail?: unknown }
  if (!response.ok) {
    throw new Error(extractErrorMessage((data as { detail?: unknown }).detail, 'Failed to save quick add setting'))
  }
  return data as QuickAddSettingResponse
}

export async function deleteQuickAddSettingAPI(accessToken: string, ingredientName: string): Promise<void> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/quick-add/settings`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ ingredient_name: ingredientName }),
  })

  const data = (await response.json()) as { status?: string; detail?: unknown }
  if (!response.ok) {
    throw new Error(extractErrorMessage(data.detail, 'Failed to delete quick add setting'))
  }
}

export async function deleteAccount(accessToken: string): Promise<void> {
  const response = await fetch(`${BACKEND_BASE_URL}/auth/account`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = (await response.json()) as { status?: string; detail?: unknown }
  if (!response.ok) {
    throw new Error(extractErrorMessage(data.detail, 'Failed to delete account'))
  }
}

export async function markItemWasted(accessToken: string, itemId: string): Promise<WasteResponse> {
  const response = await fetch(`${BACKEND_BASE_URL}/fridge/me/${itemId}/waste`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = (await response.json()) as WasteResponse | { detail?: unknown }
  if (!response.ok) {
    throw new Error(extractErrorMessage((data as { detail?: unknown }).detail, 'Failed to mark item as wasted'))
  }
  return data as WasteResponse
}

// ── Master Data Cache ──
// Master data (ingredients & recipes) changes rarely. Cache in memory to
// eliminate redundant Supabase round-trips when the user navigates between
// pages that both need the same dataset.

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const MASTER_DATA_TTL_MS = 5 * 60 * 1000 // 5 minutes

const ingredientsCache: { current: CacheEntry<DbIngredient[]> | null } = { current: null }
const recipesCache: { current: CacheEntry<DbRecipe[]> | null } = { current: null }

function isValid<T>(entry: CacheEntry<T> | null): entry is CacheEntry<T> {
  return entry !== null && Date.now() - entry.timestamp < MASTER_DATA_TTL_MS
}

// ── Master Data API (public, no auth required) ──

export async function fetchIngredients(): Promise<DbIngredient[]> {
  if (isValid(ingredientsCache.current)) return ingredientsCache.current.data

  const response = await fetch(`${BACKEND_BASE_URL}/api/ingredients`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  const data = (await response.json()) as DbIngredient[] | { detail?: unknown }
  if (!response.ok) {
    throw new Error(extractErrorMessage((data as { detail?: unknown }).detail, 'Failed to fetch ingredients'))
  }
  ingredientsCache.current = { data: data as DbIngredient[], timestamp: Date.now() }
  return data as DbIngredient[]
}

export async function fetchRecipes(): Promise<DbRecipe[]> {
  if (isValid(recipesCache.current)) return recipesCache.current.data

  const response = await fetch(`${BACKEND_BASE_URL}/api/recipes`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  const data = (await response.json()) as DbRecipe[] | { detail?: unknown }
  if (!response.ok) {
    throw new Error(extractErrorMessage((data as { detail?: unknown }).detail, 'Failed to fetch recipes'))
  }
  recipesCache.current = { data: data as DbRecipe[], timestamp: Date.now() }
  return data as DbRecipe[]
}
