# Factora Backend

FastAPI service powering the Factora accounts-receivable platform.  It handles
user authentication, invoice management (AADE/myDATA), open banking
(SaltEdge), file storage (Supabase), email/SMS notifications (Brevo), and the
main dashboard aggregation layer.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [API Routes](#api-routes)
5. [Environment Variables](#environment-variables)
6. [Local Development](#local-development)
7. [Database Migrations (Alembic)](#database-migrations-alembic)
8. [Running Tests](#running-tests)
9. [Security Notes](#security-notes)
10. [External Integrations](#external-integrations)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [FastAPI](https://fastapi.tiangolo.com/) |
| Runtime | Python ≥ 3.12, managed by [uv](https://github.com/astral-sh/uv) |
| Database | PostgreSQL via [SQLAlchemy](https://www.sqlalchemy.org/) (async) + [asyncpg](https://github.com/MagicStack/asyncpg) |
| Migrations | [Alembic](https://alembic.sqlalchemy.org/) |
| Password hashing | Argon2id via [argon2-cffi](https://argon2-cffi.readthedocs.io/) |
| Validation | [Pydantic v2](https://docs.pydantic.dev/latest/) + pydantic-settings |
| Storage | [Supabase](https://supabase.com/) Storage |
| Email / SMS | [Brevo](https://www.brevo.com/) transactional API |
| Web server | [Uvicorn](https://www.uvicorn.org/) |

---

## Architecture

The backend follows a strict **Routes → Controllers → Services → Clients/DB**
layered architecture:

```
HTTP Request
    │
    ▼
app/api/routes/          ← FastAPI routers: path params, dependencies, HTTP status
    │
    ▼
app/controllers/         ← Orchestration: validate input, call services, map to HTTP responses
    │
    ▼
app/services/            ← Business logic: auth, dashboard metrics, AADE docs, SaltEdge sync
    │
    ├── app/agents/      ← LangGraph flows (invoked from services; no imports from routes/controllers)
    ├── app/clients/     ← Thin wrappers: email, GEMI, Gmail, LLM, Supabase Storage, etc.
    ├── packages/        ← Standalone SDKs (AADE, SaltEdge) — must not import from app/
    └── app/db/          ← SQLAlchemy AsyncSession, ORM models under app/db/models/
```

**Key design principles:**

- **Singleton settings**: `app.config.settings` is instantiated once at startup.
  Route dependencies reference this singleton rather than calling `Settings()`
  per request.
- **Dependency injection**: `app/dependencies.py` provides FastAPI `Depends`
  callables for database sessions and services.
- **Pydantic models**: All request/response contracts live in `app/models/`.
  ORM objects (SQLAlchemy) live in `app/db/models/` (split by domain).

---

## Project Structure

```
backend/
├── alembic.ini                  # Alembic config (run commands from this directory)
├── alembic/
│   ├── env.py
│   └── versions/                # Migration revisions
├── scripts/
│   └── parse_pdf_cli.py         # Optional PDF text extraction CLI
├── tests/
│   ├── conftest.py              # Shared fixtures (env + mocked AsyncSession)
│   ├── unit/                    # Fast, mocked unit tests
│   └── integration/             # Broader stack / contract tests
├── packages/
│   ├── aade/                    # myDATA client SDK (api/, models/, xsd/, xml/)
│   └── saltedge/                # Open Banking client SDK (api/, models/)
├── app/
│   ├── api/routes/              # FastAPI routers (one file per domain)
│   ├── agents/                  # LangGraph agents (ingestion, reconciliation, AR collections)
│   ├── clients/                 # External I/O (email, GEMI, Gmail, LLM, storage, Stripe, …)
│   ├── controllers/
│   ├── core/                    # Exceptions, security, demo helpers
│   ├── db/models/               # SQLAlchemy ORM (identity, banking, files, …)
│   ├── db/postgres.py           # Async engine + session factory
│   ├── middleware/
│   ├── models/                  # Pydantic request/response schemas
│   ├── services/                # Business logic (includes embeddings/, storage_upload_service)
│   ├── config.py
│   ├── dependencies.py
│   └── main.py
├── .env.example
├── pyproject.toml
└── uv.lock
```

---

## API Routes

| Prefix | File | Description |
|---|---|---|
| `/companies` | `gemi_routes.py` | Search Greek Business Registry (GEMI) |
| `/files` | `file_routes.py` | Upload / download documents |
| `/onboarding` | `onboarding_routes.py` | User sign-up, phone & email verification |
| `/saltedge` | `saltedge_routes.py` | Open Banking via SaltEdge |
| `/aade` | `mydata_routes.py` | AADE/myDATA invoice submission & retrieval |
| `/dashboard` | `dashboard_routes.py` | P&L metrics, transaction history |

Interactive docs are available at `http://localhost:8000/docs` (Swagger UI) and
`http://localhost:8000/redoc` once the server is running.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in every value.  **Never commit `.env`
to version control.**

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URI` | ✅ | Async PostgreSQL connection string (`+asyncpg`, port 5432) |
| `SUPABASE_URI_SHARED_POOLER` | ✅ | Pooler connection string (`+asyncpg`, port 6543) |
| `SUPABASE_URL` | ✅ | Supabase project URL (`https://<ref>.supabase.co`) |
| `SUPABASE_SECRET_KEY` | ✅ | Supabase service-role key |
| `ALEMBIC_DATABASE_URL` | ✅ | Sync URL for Alembic migrations (`+psycopg`, port 5432) |
| `SUPABASE_BUCKET` | ✅ | Storage bucket name |
| `BREVO_API_KEY` | ✅ | Brevo REST API key |
| `BREVO_SMTP_KEY` | ✅ | Brevo SMTP API key |
| `BREVO_SENDER_EMAIL` | ✅ | Verified sender address |
| `BREVO_SENDER_NAME` | ✅ | Display name for outgoing email/SMS |
| `GEMH_API_KEY` | ✅ | Greek Business Registry API key |
| `AADE_USERNAME` | ✅ | AADE/myDATA account username |
| `AADE_SUBSCRIPTION_KEY` | ✅ | AADE/myDATA subscription key |
| `SALTEDGE_APP_ID` | ✅ | SaltEdge application ID |
| `SALTEDGE_SECRET` | ✅ | SaltEdge API secret |
| `CODE_PEPPER` | ✅ | Server-side pepper for Argon2 hashes (≥ 16 random chars) |
| `NGROK_DEV_BASE_URL` | ✅ | Base URL for password-reset links in development |
| `CORS_ORIGINS` | optional | Comma-separated allowed origins. Empty = deny all (production default) |
| `TRUSTED_PROXIES` | optional | Comma-separated proxy IPs. Default `*` |

Generate a strong `CODE_PEPPER`:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## Local Development

### Prerequisites

- Python ≥ 3.12
- [uv](https://github.com/astral-sh/uv) (`pip install uv` or see uv docs)
- A running PostgreSQL instance (or a Supabase project)

### Setup

```bash
# 1. Clone and enter the backend directory
cd backend/

# 2. Install all dependencies (including dev group)
uv sync --all-groups

# 3. Copy and populate the env file
cp .env.example .env
# Edit .env with your credentials

# 4. Run database migrations
uv run alembic upgrade head

# 5. Start the development server
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`.

### Adding a dependency

Always use `uv add` — never manually edit `pyproject.toml` without running
`uv lock` afterward:

```bash
uv add <package>          # runtime dependency
uv add --dev <package>    # development-only dependency
```

---

## Database Migrations (Alembic)

Alembic migrations live in `alembic/` at the backend root (next to `alembic.ini`). The `ALEMBIC_DATABASE_URL` env
var must use a **synchronous** driver (`+psycopg` or `+psycopg2`) on port 5432
(direct connection, not the Supabase pooler).

```bash
# Apply all pending migrations
uv run alembic upgrade head

# Create a new auto-generated migration
uv run alembic revision --autogenerate -m "describe your change"

# Roll back one revision
uv run alembic downgrade -1
```

---

## Running Tests

Tests use `pytest-asyncio` in `auto` mode and mock all external dependencies
(SQLAlchemy `AsyncSession`, Brevo, etc.) — no real database or network calls
are required.

```bash
# Run all tests (from backend/)
uv run pytest tests/ -v

# Unit or integration only
uv run pytest tests/unit/ -v
uv run pytest tests/integration/ -v

# Coverage
uv run pytest tests/ --cov=app --cov-report=term-missing
```

### Test layout

| Path | Role |
|---|---|
| `tests/conftest.py` | Env defaults + mocked `AsyncSession`, shared fixtures |
| `tests/unit/` | Domain unit tests (services, agents, clients, controllers) |
| `tests/integration/` | Integration-style tests (e.g. Stripe flows) |

---

## Security Notes

- **Passwords** are hashed with **Argon2id** (via `argon2-cffi`) with a
  server-side pepper.  Plain-text passwords are never persisted.
- **Access tokens** are stored as **SHA-256 hashes**.  The raw bearer token is
  only returned to the client once and never stored.
- **Token expiry** is enforced server-side on every authenticated request.
- **CORS** defaults to deny-all (`CORS_ORIGINS` is empty).  Explicitly list
  allowed origins for each environment.
- The `CORS_ORIGINS = "*"` wildcard is supported only for development.  Never
  use it in production.

---

## External Integrations

| Service | Purpose | Env vars |
|---|---|---|
| **Supabase** | PostgreSQL + file storage | `SUPABASE_*` |
| **Brevo** | Transactional email and SMS | `BREVO_*` |
| **GEMI** (ΓΕΜΗ) | Greek Business Registry search | `GEMH_API_KEY` |
| **AADE / myDATA** | Greek Tax Authority e-invoice API | `AADE_USERNAME`, `AADE_SUBSCRIPTION_KEY` |
| **SaltEdge** | Open Banking (bank connections, accounts, transactions) | `SALTEDGE_APP_ID`, `SALTEDGE_SECRET` |
