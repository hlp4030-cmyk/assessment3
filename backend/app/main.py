"""FastAPI app exposing auth + profile endpoints."""

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .models import (
    AuthResponse,
    CookRequest,
    CookResponse,
    FridgeItemCreateRequest,
    FridgeItemResponse,
    FridgeItemUpdateRequest,
    HealthResponse,
    IngredientResponse,
    LoginRequest,
    ProfilePayload,
    ProfileResponse,
    QuickAddSettingDeleteRequest,
    QuickAddSettingResponse,
    QuickAddSettingUpsertRequest,
    RecipeIngredientResolved,
    RecipeResponse,
    SignupRequest,
    WasteResponse,
)
from .supabase_auth import (
    create_fridge_item,
    delete_fridge_item,
    delete_quick_add_setting,
    get_auth_user,
    get_fridge_item_by_id,
    get_user_profile,
    list_all_ingredients,
    list_all_recipes,
    list_fridge_items,
    list_quick_add_settings,
    login_with_supabase,
    signup_with_supabase,
    update_fridge_item,
    update_profile_goal_fields,
    upsert_quick_add_setting,
    upsert_user_profile,
)

app = FastAPI(title="Eat It Up Backend", version="0.1.0")

# Minimal CORS setup for local Vite frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Health check endpoint."""

    return HealthResponse(status="ok")


@app.post("/auth/signup", response_model=AuthResponse)
async def signup(payload: SignupRequest) -> AuthResponse:
    """Signup endpoint forwarding to Supabase Auth."""

    result = await signup_with_supabase(email=payload.email, password=payload.password)

    return AuthResponse(
        access_token=result.get("access_token"),
        refresh_token=result.get("refresh_token"),
        user=result.get("user"),
        raw=result,
    )


@app.post("/auth/login", response_model=AuthResponse)
async def login(payload: LoginRequest) -> AuthResponse:
    """Login endpoint forwarding to Supabase Auth password grant."""

    result = await login_with_supabase(email=payload.email, password=payload.password)

    # In production, tokens should be verified properly and handled securely.
    return AuthResponse(
        access_token=result.get("access_token"),
        refresh_token=result.get("refresh_token"),
        user=result.get("user"),
        raw=result,
    )


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid Authorization header")
    return parts[1]


async def _resolve_user_id_from_auth_header(authorization: str | None) -> tuple[str, str]:
    access_token = _extract_bearer_token(authorization)
    auth_user = await get_auth_user(access_token)
    user_id = auth_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unable to resolve authenticated user")
    return access_token, user_id


@app.get("/profile/me", response_model=ProfileResponse)
async def profile_me(authorization: str | None = Header(default=None)) -> ProfileResponse:
    """Fetch current user's profile from Supabase profiles table."""

    # In production, token verification and dedicated auth middleware should be implemented.
    access_token, user_id = await _resolve_user_id_from_auth_header(authorization)

    profile = await get_user_profile(access_token=access_token, user_id=user_id)
    if not profile:
        return ProfileResponse(id=user_id)
    return ProfileResponse(**profile)


@app.put("/profile/me", response_model=ProfileResponse)
async def update_profile_me(payload: ProfilePayload, authorization: str | None = Header(default=None)) -> ProfileResponse:
    """Upsert current user's profile fields into Supabase profiles table."""

    access_token, user_id = await _resolve_user_id_from_auth_header(authorization)

    data = payload.model_dump(exclude_none=True)
    updated = await upsert_user_profile(access_token=access_token, user_id=user_id, payload=data)
    return ProfileResponse(**updated)


@app.get("/fridge/me", response_model=list[FridgeItemResponse])
async def get_fridge_me(authorization: str | None = Header(default=None), status: str = "in_fridge") -> list[FridgeItemResponse]:
    access_token, user_id = await _resolve_user_id_from_auth_header(authorization)
    rows = await list_fridge_items(access_token=access_token, user_id=user_id, status=status)
    return [FridgeItemResponse(**row) for row in rows]


@app.post("/fridge/me", response_model=FridgeItemResponse)
async def post_fridge_me(payload: FridgeItemCreateRequest, authorization: str | None = Header(default=None)) -> FridgeItemResponse:
    access_token, user_id = await _resolve_user_id_from_auth_header(authorization)
    row = await create_fridge_item(access_token=access_token, user_id=user_id, payload=payload.model_dump(exclude_none=True))
    return FridgeItemResponse(**row)


@app.patch("/fridge/me/{item_id}", response_model=FridgeItemResponse)
async def patch_fridge_me(item_id: str, payload: FridgeItemUpdateRequest, authorization: str | None = Header(default=None)) -> FridgeItemResponse:
    access_token, user_id = await _resolve_user_id_from_auth_header(authorization)
    row = await update_fridge_item(
        access_token=access_token,
        user_id=user_id,
        item_id=item_id,
        payload=payload.model_dump(exclude_none=True),
    )
    return FridgeItemResponse(**row)


@app.delete("/fridge/me/{item_id}")
async def remove_fridge_me(item_id: str, authorization: str | None = Header(default=None)) -> dict[str, str]:
    access_token, user_id = await _resolve_user_id_from_auth_header(authorization)
    await delete_fridge_item(access_token=access_token, user_id=user_id, item_id=item_id)
    return {"status": "deleted"}


# ---------------------------------------------------------------------------
# Flow A: Complete Cooking — mark items as 'used', update profile goals
# ---------------------------------------------------------------------------

# Reward constants (mirror frontend rewardEngine.ts)
_SAVINGS_PER_INGREDIENT = 2
_SAVINGS_MIN = 6
_CO2E_PER_INGREDIENT = 0.08
_CO2E_MIN = 0.12


@app.post("/fridge/me/cook", response_model=CookResponse)
async def cook_recipe(payload: CookRequest, authorization: str | None = Header(default=None)) -> CookResponse:
    """Process a completed recipe: mark depleted items as 'used', update goals."""

    access_token, user_id = await _resolve_user_id_from_auth_header(authorization)

    updated_items: list[FridgeItemResponse] = []
    used_item_ids: list[str] = []

    for cook_item in payload.items:
        row = await get_fridge_item_by_id(access_token, user_id, cook_item.item_id)
        current_qty = float(row.get("quantity", 0))
        new_qty = max(0.0, current_qty - cook_item.quantity_used)

        if new_qty <= 0:
            # Fully consumed → mark as 'used'
            patched = await update_fridge_item(access_token, user_id, cook_item.item_id, {
                "quantity": 0,
                "status": "used",
            })
            used_item_ids.append(cook_item.item_id)
        else:
            # Partially consumed → reduce quantity, keep 'in_fridge'
            patched = await update_fridge_item(access_token, user_id, cook_item.item_id, {
                "quantity": new_qty,
            })
            updated_items.append(FridgeItemResponse(**patched))

    # Calculate reward values
    ingredient_count = len(payload.items)
    savings_delta = max(_SAVINGS_MIN, ingredient_count * _SAVINGS_PER_INGREDIENT)
    co2e_delta = max(_CO2E_MIN, round(ingredient_count * _CO2E_PER_INGREDIENT, 2))

    # Update profile goals
    updated_profile = await update_profile_goal_fields(
        access_token,
        user_id,
        delta_cooking=1,
        delta_savings=savings_delta,
        delta_co2e=co2e_delta,
    )

    return CookResponse(
        updated_items=updated_items,
        used_item_ids=used_item_ids,
        profile=ProfileResponse(**updated_profile),
        meals_cooked=1,
        savings_delta=savings_delta,
        co2e_delta=co2e_delta,
    )


# ---------------------------------------------------------------------------
# Flow B: Waste / Discard — mark item as 'wasted', penalise goals
# ---------------------------------------------------------------------------

_SAVINGS_PENALTY = 1.5
_CO2E_PENALTY = 0.08


@app.patch("/fridge/me/{item_id}/waste", response_model=WasteResponse)
async def waste_item(item_id: str, authorization: str | None = Header(default=None)) -> WasteResponse:
    """Discard an item: mark as 'wasted' and penalise profile goals."""

    access_token, user_id = await _resolve_user_id_from_auth_header(authorization)

    # Verify ownership and fetch current item
    await get_fridge_item_by_id(access_token, user_id, item_id)

    # Mark as wasted
    patched = await update_fridge_item(access_token, user_id, item_id, {
        "status": "wasted",
    })

    # Apply penalty to profile
    updated_profile = await update_profile_goal_fields(
        access_token,
        user_id,
        delta_savings=-_SAVINGS_PENALTY,
        delta_co2e=-_CO2E_PENALTY,
    )

    return WasteResponse(
        item=FridgeItemResponse(**patched),
        profile=ProfileResponse(**updated_profile),
        savings_penalty=_SAVINGS_PENALTY,
        co2e_penalty=_CO2E_PENALTY,
    )


# ---------------------------------------------------------------------------
# Quick-Add Settings — persistent per-user ingredient defaults
# ---------------------------------------------------------------------------


@app.get("/api/quick-add/settings", response_model=list[QuickAddSettingResponse])
async def get_quick_add_settings(authorization: str | None = Header(default=None)) -> list[QuickAddSettingResponse]:
    """Retrieve all custom quick-add settings for the authenticated user."""

    access_token, user_id = await _resolve_user_id_from_auth_header(authorization)
    rows = await list_quick_add_settings(access_token, user_id)
    return [QuickAddSettingResponse(**row) for row in rows]


@app.post("/api/quick-add/settings", response_model=QuickAddSettingResponse)
async def post_quick_add_setting(payload: QuickAddSettingUpsertRequest, authorization: str | None = Header(default=None)) -> QuickAddSettingResponse:
    """Upsert a custom quick-add setting for the authenticated user."""

    access_token, user_id = await _resolve_user_id_from_auth_header(authorization)
    row = await upsert_quick_add_setting(access_token, user_id, payload.model_dump())
    return QuickAddSettingResponse(**row)


@app.delete("/api/quick-add/settings")
async def remove_quick_add_setting(payload: QuickAddSettingDeleteRequest, authorization: str | None = Header(default=None)) -> dict[str, str]:
    """Delete a custom quick-add setting for the authenticated user."""

    access_token, user_id = await _resolve_user_id_from_auth_header(authorization)
    await delete_quick_add_setting(access_token, user_id, payload.ingredient_name)
    return {"status": "deleted"}


# ---------------------------------------------------------------------------
# Master Data — Ingredients & Recipes (public, no auth required)
# ---------------------------------------------------------------------------


@app.get("/api/ingredients", response_model=list[IngredientResponse])
async def get_ingredients() -> list[IngredientResponse]:
    """Fetch all ingredients from the public master table."""

    rows = await list_all_ingredients()
    return [IngredientResponse(**row) for row in rows]


@app.get("/api/recipes", response_model=list[RecipeResponse])
async def get_recipes() -> list[RecipeResponse]:
    """Fetch all recipes from the public master table.

    Resolves ingredient IDs in ``required_ingredients`` JSONB to their names
    by cross-referencing the ingredients table, and parses the pipe-delimited
    ``instructions`` TEXT into a list of steps.
    """

    import json

    recipe_rows = await list_all_recipes()
    ingredient_rows = await list_all_ingredients()

    # Build id → name lookup map
    id_to_name: dict[str, str] = {row["id"]: row["name"] for row in ingredient_rows}

    results: list[RecipeResponse] = []
    for r in recipe_rows:
        # Parse required_ingredients JSONB
        raw_ingredients = r.get("required_ingredients") or []
        if isinstance(raw_ingredients, str):
            raw_ingredients = json.loads(raw_ingredients)

        resolved: list[RecipeIngredientResolved] = []
        for item in raw_ingredients:
            ing_id = item.get("id", "")
            resolved.append(
                RecipeIngredientResolved(
                    id=ing_id,
                    name=id_to_name.get(ing_id, ing_id),
                    quantity=float(item.get("qty", 0)),
                    unit=item.get("unit", "ea"),
                )
            )

        # Parse instructions TEXT by pipe delimiter
        instructions_text = r.get("instructions") or ""
        steps = [s.strip() for s in instructions_text.split("|") if s.strip()]

        results.append(
            RecipeResponse(
                recipe_id=r.get("recipe_id", ""),
                title=r.get("title", ""),
                description=r.get("description"),
                cooking_time_mins=int(r.get("cooking_time_mins", 0)),
                image_url=r.get("image_url"),
                required_ingredients=resolved,
                steps=steps,
                meal_type=r.get("meal_type", "all"),
            )
        )

    return results
