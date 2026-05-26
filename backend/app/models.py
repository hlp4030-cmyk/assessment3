"""Pydantic models for request and response payloads."""

from typing import Any

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


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
