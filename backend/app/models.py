"""Pydantic models for request and response payloads."""

import re
from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]", v):
            raise ValueError("Password must contain at least one special character")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class HealthResponse(BaseModel):
    status: str = "ok"


class AuthResponse(BaseModel):
    """Minimal auth response returned by backend for login/signup."""

    access_token: str | None = None
    refresh_token: str | None = None
    user: dict[str, Any] | None = None
    raw: dict[str, Any] | None = None


class ProfilePayload(BaseModel):
    nickname: str | None = None
    age_group: str | None = None
    diet: str | None = None
    allergy: str | None = None
    goal_cooking: int | None = None
    goal_savings: float | None = None
    goal_co2e: float | None = None


class ProfileResponse(ProfilePayload):
    id: str | None = None
    created_at: str | None = None


class FridgeItemCreateRequest(BaseModel):
    ingredient: str
    quantity: float
    unit: str
    expiry_date: str
    status: str | None = None
    category: str | None = None


class FridgeItemUpdateRequest(BaseModel):
    ingredient: str | None = None
    quantity: float | None = None
    unit: str | None = None
    expiry_date: str | None = None
    status: str | None = None
    category: str | None = None


class FridgeItemResponse(BaseModel):
    id: str
    created_at: str | None = None
    user_id: str
    ingredient: str
    quantity: float
    unit: str
    expiry_date: str
    status: str | None = None
    category: str | None = None


class CookItem(BaseModel):
    """A single ingredient consumed during cooking."""

    item_id: str
    quantity_used: float


class CookRequest(BaseModel):
    """Payload sent when the user completes a recipe."""

    recipe_name: str
    items: list[CookItem]


class CookResponse(BaseModel):
    """Result returned after cooking a recipe."""

    updated_items: list[FridgeItemResponse]
    used_item_ids: list[str]
    profile: ProfileResponse
    meals_cooked: int
    savings_delta: float
    co2e_delta: float


class WasteResponse(BaseModel):
    """Result returned after discarding an item."""

    item: FridgeItemResponse
    profile: ProfileResponse
    savings_penalty: float
    co2e_penalty: float


class QuickAddSettingResponse(BaseModel):
    """A user's custom quick-add ingredient default."""

    id: str
    user_id: str
    ingredient_name: str
    default_quantity: float
    unit: str


class QuickAddSettingUpsertRequest(BaseModel):
    """Payload to upsert a quick-add setting."""

    ingredient_name: str
    default_quantity: float = Field(gt=0)
    unit: str


class QuickAddSettingDeleteRequest(BaseModel):
    """Payload to delete a quick-add setting."""

    ingredient_name: str


# ---------------------------------------------------------------------------
# Master Data — Ingredients & Recipes (fetched from Supabase tables)
# ---------------------------------------------------------------------------


class IngredientResponse(BaseModel):
    """A row from the public `ingredients` master table."""

    id: str
    name: str
    category: str
    standard_unit: str
    default_shelf_life_days: int
    default_quantity: int
    image_url: str | None = None
    approx_price: float | None = None
    co2_index: float | None = None


class RecipeIngredientResolved(BaseModel):
    """A single required ingredient inside a recipe, resolved with the ingredient name."""

    id: str
    name: str
    quantity: float
    unit: str


class RecipeResponse(BaseModel):
    """A row from the public `recipes` master table, with resolved ingredients and parsed steps."""

    recipe_id: str
    title: str
    description: str | None = None
    cooking_time_mins: int
    image_url: str | None = None
    required_ingredients: list[RecipeIngredientResolved]
    steps: list[str]
    meal_type: str
