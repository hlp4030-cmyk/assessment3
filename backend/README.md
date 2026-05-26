# Eat It Up Backend (Minimal Auth API)

This backend is a minimal FastAPI service that proxies auth requests to Supabase Auth.

## Endpoints

- `GET /health` → `{ "status": "ok" }`
- `POST /auth/signup` → signup using email/password (+ optional nickname)
- `POST /auth/login` → returns `access_token`, `refresh_token`, and user info

## Environment Variables

Create `backend/.env` from `.env.example` and fill values:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
FRONTEND_ORIGIN=http://localhost:5173
```

## Setup (PowerShell)

Run from project root:

```powershell
cd .\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Notes

- This API currently handles **auth only** (no database read/write).
- The backend uses Supabase Auth REST endpoints through `httpx`.
- In production, tokens should be verified properly, stored securely, and rotated according to your security policy.
