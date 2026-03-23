# Factora Development Agent Instructions

See `CLAUDE.md` for full engineering rules, architecture, and coding standards.

## Cursor Cloud specific instructions

### Services overview

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| Backend (FastAPI) | `cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload` | 8000 | Swagger UI at `/docs` |
| Frontend (Next.js) | `cd frontend && pnpm dev --port 3000` | 3000 | Uses Turbopack |

### Environment variables

All required secrets (Supabase, Brevo, AADE, SaltEdge, GEMI, JWT, etc.) are injected via Cursor Cloud Secrets. **Do not create a `backend/.env` file** — the injected env vars take precedence and a `.env` file would shadow them.

### PostgreSQL (local)

A local PostgreSQL 16 instance with pgvector is available. Start it before running the backend:

```
sudo pg_ctlcluster 16 main start
```

The Supabase credentials point to a remote database, so migrations and the backend connect to Supabase, not the local Postgres.

### Backend

- **Package manager**: `uv` (installed at `~/.local/bin/uv`)
- **Install deps**: `cd backend && uv sync --all-groups`
- **Run tests**: `cd backend && uv run pytest tests/ -v` (all tests are mocked — no DB or network required)
- **Lint**: No dedicated linter configured; rely on type checking and tests
- **Start server**: `cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`

### Frontend

- **Package manager**: `pnpm` (v10.23.0, available via nvm Node v22)
- **Install deps**: `cd frontend && pnpm install`
- **Lint**: `pnpm lint` does not work in Next.js 16 (the `next lint` CLI subcommand was removed). ESLint 9 requires flat config but the repo uses legacy `.eslintrc.json`. This is a known pre-existing issue.
- **Build**: `cd frontend && pnpm build` (has `eslint` and `typescript` errors ignored in `next.config.mjs`)
- **Start dev server**: `cd frontend && pnpm dev --port 3000`

### Gotchas

- The `pnpm.onlyBuiltDependencies` field in `frontend/package.json` allows build scripts for `@tailwindcss/oxide`, `core-js`, `sharp`, and `unrs-resolver`. Without this, `pnpm install` will warn about ignored build scripts.
- The backend `Settings` class requires all external integration env vars (Brevo, AADE, SaltEdge, GEMI) even in development mode. Dummy values work since external calls are not made locally unless explicitly triggered.
- `ENVIRONMENT=development` is the correct mode for local dev. `demo` mode returns static fixtures for all external calls.
- Frontend TypeScript has some pre-existing errors (missing `@/lib/onboarding`, `@/lib/i18n` modules). These do not block the dev server.
