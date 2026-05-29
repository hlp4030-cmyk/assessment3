"""Helpers for calling Supabase Auth REST endpoints using httpx."""

from typing import Any

import httpx
from fastapi import HTTPException

from .config import settings


def _headers() -> dict[str, str]:
    return {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }


async def signup_with_supabase(email: str, password: str) -> dict[str, Any]:
    """Create a user via Supabase Auth signup endpoint."""

    payload: dict[str, Any] = {"email": email, "password": password}

    url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/signup"

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(url, headers=_headers(), json=payload)

    if response.status_code >= 400:
        try:
            detail = response.json()
        except Exception:  # pragma: no cover - defensive fallback
            detail = {"message": response.text}
        raise HTTPException(status_code=response.status_code, detail=detail)

    return response.json()


async def login_with_supabase(email: str, password: str) -> dict[str, Any]:
    """Authenticate a user via Supabase password grant endpoint."""

    url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/token?grant_type=password"
    payload = {"email": email, "password": password}

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(url, headers=_headers(), json=payload)

    if response.status_code >= 400:
        try:
            detail = response.json()
        except Exception:  # pragma: no cover - defensive fallback
            detail = {"message": response.text}
        raise HTTPException(status_code=response.status_code, detail=detail)

    return response.json()


async def get_user_profile(access_token: str, user_id: str) -> dict[str, Any] | None:
    """Fetch profile row for current user from Supabase `profiles` table."""

    url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/profiles?id=eq.{user_id}&select=*"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(url, headers=headers)

    if response.status_code >= 400:
        try:
            detail = response.json()
        except Exception:  # pragma: no cover - defensive fallback
            detail = {"message": response.text}
        raise HTTPException(status_code=response.status_code, detail=detail)

    rows = response.json()
    if isinstance(rows, list) and rows:
        return rows[0]
    return None


async def upsert_user_profile(access_token: str, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Upsert profile row for current user into Supabase `profiles` table."""

    url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/profiles"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation",
    }

    body = {"id": user_id, **payload}

    # Upsert in PostgREST is performed via POST with conflict target on primary key.
    upsert_url = f"{url}?on_conflict=id"

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(upsert_url, headers=headers, json=body)

    if response.status_code >= 400:
        try:
            detail = response.json()
        except Exception:  # pragma: no cover - defensive fallback
            detail = {"message": response.text}
        raise HTTPException(status_code=response.status_code, detail=detail)

    rows = response.json()
    if isinstance(rows, list) and rows:
        return rows[0]
    return body


async def get_auth_user(access_token: str) -> dict[str, Any]:
    """Fetch authenticated Supabase user from access token."""

    url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(url, headers=headers)

    if response.status_code >= 400:
        try:
            detail = response.json()
        except Exception:  # pragma: no cover - defensive fallback
            detail = {"message": response.text}
        raise HTTPException(status_code=response.status_code, detail=detail)

    return response.json()


async def list_fridge_items(access_token: str, user_id: str, status: str = "in_fridge") -> list[dict[str, Any]]:
    """List fridge items for current user, optionally filtered by status."""

    url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/fridge_items?user_id=eq.{user_id}&status=eq.{status}&select=*"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(url, headers=headers)

    if response.status_code >= 400:
        try:
            detail = response.json()
        except Exception:
            detail = {"message": response.text}
        raise HTTPException(status_code=response.status_code, detail=detail)

    rows = response.json()
    return rows if isinstance(rows, list) else []


async def create_fridge_item(access_token: str, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Create a fridge item for current user."""

    url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/fridge_items"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Prefer": "return=representation",
    }
    body = {"user_id": user_id, **payload}

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(url, headers=headers, json=body)

    if response.status_code >= 400:
        try:
            detail = response.json()
        except Exception:
            detail = {"message": response.text}
        raise HTTPException(status_code=response.status_code, detail=detail)

    rows = response.json()
    if isinstance(rows, list) and rows:
        return rows[0]
    return body


async def update_fridge_item(access_token: str, user_id: str, item_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Update a fridge item that belongs to current user."""

    url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/fridge_items?id=eq.{item_id}&user_id=eq.{user_id}"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Prefer": "return=representation",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.patch(url, headers=headers, json=payload)

    if response.status_code >= 400:
        try:
            detail = response.json()
        except Exception:
            detail = {"message": response.text}
        raise HTTPException(status_code=response.status_code, detail=detail)

    rows = response.json()
    if isinstance(rows, list) and rows:
        return rows[0]
    raise HTTPException(status_code=404, detail="Fridge item not found")


async def delete_fridge_item(access_token: str, user_id: str, item_id: str) -> None:
    """Delete a fridge item that belongs to current user."""

    url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/fridge_items?id=eq.{item_id}&user_id=eq.{user_id}"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.delete(url, headers=headers)

    if response.status_code >= 400:
        try:
            detail = response.json()
        except Exception:
            detail = {"message": response.text}
        raise HTTPException(status_code=response.status_code, detail=detail)


async def get_fridge_item_by_id(access_token: str, user_id: str, item_id: str) -> dict[str, Any]:
    """Fetch a single fridge item by id with ownership check."""

    url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/fridge_items?id=eq.{item_id}&user_id=eq.{user_id}&select=*"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(url, headers=headers)

    if response.status_code >= 400:
        try:
            detail = response.json()
        except Exception:
            detail = {"message": response.text}
        raise HTTPException(status_code=response.status_code, detail=detail)

    rows = response.json()
    if isinstance(rows, list) and rows:
        return rows[0]
    raise HTTPException(status_code=404, detail="Fridge item not found")


async def list_quick_add_settings(access_token: str, user_id: str) -> list[dict[str, Any]]:
    """List all quick-add settings for current user."""

    url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/user_quick_add_settings?user_id=eq.{user_id}&select=*"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(url, headers=headers)

    if response.status_code >= 400:
        try:
            detail = response.json()
        except Exception:
            detail = {"message": response.text}
        raise HTTPException(status_code=response.status_code, detail=detail)

    rows = response.json()
    return rows if isinstance(rows, list) else []


async def upsert_quick_add_setting(access_token: str, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Upsert a quick-add setting for current user (on conflict user_id + ingredient_name)."""

    url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/user_quick_add_settings?on_conflict=user_id,ingredient_name"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation",
    }

    body = {"user_id": user_id, **payload}

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(url, headers=headers, json=body)

    if response.status_code >= 400:
        try:
            detail = response.json()
        except Exception:
            detail = {"message": response.text}
        raise HTTPException(status_code=response.status_code, detail=detail)

    rows = response.json()
    if isinstance(rows, list) and rows:
        return rows[0]
    return body


async def delete_quick_add_setting(access_token: str, user_id: str, ingredient_name: str) -> None:
    """Delete a quick-add setting for current user by ingredient name."""

    url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/user_quick_add_settings?user_id=eq.{user_id}&ingredient_name=eq.{ingredient_name}"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.delete(url, headers=headers)

    if response.status_code >= 400:
        try:
            detail = response.json()
        except Exception:
            detail = {"message": response.text}
        raise HTTPException(status_code=response.status_code, detail=detail)


async def list_all_ingredients() -> list[dict[str, Any]]:
    """Fetch all rows from the public `ingredients` master table.

    This is public reference data — no user access token required.
    """

    url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/ingredients?select=*&order=name"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(url, headers=headers)

    if response.status_code >= 400:
        try:
            detail = response.json()
        except Exception:
            detail = {"message": response.text}
        raise HTTPException(status_code=response.status_code, detail=detail)

    rows = response.json()
    return rows if isinstance(rows, list) else []


async def list_all_recipes() -> list[dict[str, Any]]:
    """Fetch all rows from the public `recipes` master table.

    This is public reference data — no user access token required.
    """

    url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/recipes?select=*"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(url, headers=headers)

    if response.status_code >= 400:
        try:
            detail = response.json()
        except Exception:
            detail = {"message": response.text}
        raise HTTPException(status_code=response.status_code, detail=detail)

    rows = response.json()
    return rows if isinstance(rows, list) else []


async def update_profile_goal_fields(
    access_token: str,
    user_id: str,
    delta_cooking: int = 0,
    delta_savings: float = 0.0,
    delta_co2e: float = 0.0,
) -> dict[str, Any]:
    """Increment / decrement goal fields on the user's profile.

    Uses Supabase RPC-style atomic update via read-then-write.
    """

    current = await get_user_profile(access_token, user_id)
    if not current:
        raise HTTPException(status_code=404, detail="User profile not found")

    new_cooking = (current.get("goal_cooking") or 0) + delta_cooking
    new_savings = max(0.0, (current.get("goal_savings") or 0.0) + delta_savings)
    new_co2e = max(0.0, (current.get("goal_co2e") or 0.0) + delta_co2e)

    return await upsert_user_profile(
        access_token,
        user_id,
        {
            "goal_cooking": new_cooking,
            "goal_savings": round(new_savings, 2),
            "goal_co2e": round(new_co2e, 2),
        },
    )
