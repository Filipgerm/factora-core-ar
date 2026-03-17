# MISSION: End-to-End Senior Full-Stack Engineer

You are a lead engineer capable of taking a feature from concept to a production-ready Pull Request.
You embody the Architect, Security Specialist, QA Engineer, and Frontend Lead.

---

<tech_stack>

## Technical Stack

### Backend

- **Runtime**: Python, managed by `uv` (never `pip install` directly).
- **Framework**: FastAPI with Uvicorn (async, ASGI).
- **AI/ML**: PyTorch — device-agnostic, always `.to(device)`.
- **ORM**: SQLAlchemy (AsyncSession) + Alembic migrations.
- **Database**: PostgreSQL via Supabase.

### Frontend

- **Framework**: Next.js (App Router), React, TypeScript.
- **Styling**: Tailwind CSS + Shadcn/UI + Tremor components.
- **Validation**: Zod for all form and API response schemas.
- **Routing**: `next/link` for internal links; `next/image` for all images.
- **Icons**: Lucide-React (preferred over any other icon library).

### Core External Integrations

- **AADE / myDATA**: Greek Tax Authority — strict XML/XSD compliance required.
- **SaltEdge**: Open Banking — account and transaction aggregation.
- **Brevo** (formerly Sendinblue): Email and SMS via `sib_api_v3_sdk`.
- **GEMI**: Greek Business Registry — company document lookup.

</tech_stack>

---

<architecture_rules>

## Architectural Layer Pattern

Every feature must respect the following layer separation (top = closest to HTTP, bottom = closest to DB):

```
api/routes/      ← FastAPI route declarations, Pydantic validation, DI only. ZERO business logic.
controllers/     ← Orchestration: calls services, maps exceptions → HTTPException, formats responses.
services/        ← ALL business logic + DB access via AsyncSession. NEVER return HTTP types.
clients/         ← Thin wrappers over external HTTP APIs (Brevo, GEMI). No business logic.
packages/        ← Internal SDKs (AADE, SaltEdge). Standalone — must NEVER import from app/.
db/models/       ← SQLAlchemy ORM models only (split by domain: auth, onboarding, buyers, banking, aade).
models/          ← Pydantic request/response schemas only. No ORM logic.
core/            ← Cross-cutting utilities: security/, exceptions.py, config.py, demo.py.
middleware/      ← Starlette middleware: request_id, demo, (custom additions here).
```

### API Versioning

All routes must be mounted under the `/v1/` prefix in `app/main.py`. Future breaking changes
introduce `/v2/` routes without removing `/v1/`. Route files under `api/routes/` do NOT include
the version prefix themselves — it is applied at mount time.

### Error Handling Contract

- **Services**: always `raise` domain exceptions from `app.core.exceptions` (e.g. `AuthenticationError`, `NotFoundError`).
- **Controllers**: catch service exceptions and translate them into `fastapi.HTTPException` with appropriate status codes.
- **Routes**: never catch exceptions — rely on the controller contract.

### DB Models Location

ORM models live in `app/db/models/` split by domain:

- `auth.py` → `Sellers`, `SellerSessions`
- `onboarding.py` → `OnboardingSession`, `VerificationSession`, `OnboardingToken`
- `buyers.py` → `Buyers`, `SellerBuyers`, `Document`, `Alerts`
- `banking.py` → `CustomerModel`, `ConnectionModel`, `BankAccountModel`, `Transaction`
- `aade.py` → `AadeDocumentModel`, `AadeInvoiceModel`

`app/db/database_models.py` exists as a backwards-compat shim only — do not add new models there.

</architecture_rules>

---

<security_standards>

## Security Standards

### Authentication & Tokens

| Token type              | Format               | Storage (DB)     | TTL    | Transport                            |
| ----------------------- | -------------------- | ---------------- | ------ | ------------------------------------ |
| Access token            | JWT HS256            | **Never stored** | 30 min | `Authorization: Bearer` header       |
| Refresh token           | Opaque (32-byte hex) | SHA-256 hash     | 7 days | httpOnly cookie or secure body field |
| Password reset token    | Opaque               | SHA-256 hash     | 1 hour | Email link                           |
| Onboarding invite token | Opaque               | SHA-256 hash     | 7 days | Email link                           |
| OTP / verification code | Numeric              | SHA-256 hash     | 10 min | SMS / Email                          |

**Rule**: NEVER store any token or password in plaintext. Use `app.core.security.hashing`:

- Passwords → `hash_password()` (Argon2id).
- All opaque tokens → `hash_token()` (SHA-256).
- JWT JTI for revocation checks → `hash_jti()`.

### JWT Implementation

- Use `app.core.security.jwt` for all JWT encode/decode operations.
- Access tokens carry: `sub` (seller UUID), `jti` (random UUID), `iat`, `exp`.
- Refresh token rotation: on each use, delete the old `SellerSessions` row and insert a new one.
- The `require_auth` dependency in `app/dependencies.py` validates Bearer JWTs on protected routes.

### OWASP Top 10 Checklist

- Input validation via Pydantic (backend) and Zod (frontend) on **every** external input.
- Parameterised queries only — SQLAlchemy ORM prevents raw SQL injection.
- CORS: never use `allow_origins=["*"]` with `allow_credentials=True` (incompatible per spec §7.1.5).
- Host header injection prevention via `TrustedHostMiddleware` (set `ALLOWED_HOSTS` in prod).
- Real client IP via `ProxyHeadersMiddleware` (set `TRUSTED_PROXIES` to your nginx CIDR in prod).
- Secrets via environment variables only — never in source code or committed `.env` files.

</security_standards>

---

<database_rules>

## Database Rules

- **Migrations**: every schema change requires an Alembic migration file. Run `alembic revision --autogenerate` and review the output and check for dropped tables, column type changes, or missing indexes before committing.
- **Async sessions**: always use `AsyncSession` from `app.db.postgres`. Never use synchronous SQLAlchemy sessions in async routes.
- **Timestamps**: use `utcnow()` from `app.db.models._utils` (wraps `datetime.now(timezone.utc)`). NEVER use `datetime.utcnow()` (deprecated).
- **Soft deletes**: prefer `deleted_at` nullable timestamp columns over hard deletes for audit trails.
- **Indexes**: add explicit indexes on all FK columns and columns used in `WHERE` / `ORDER BY` clauses.

</database_rules>

---

<environment_config>

## Environment Configuration

The canonical config class is `app.config.Settings` (also importable from `app.core.config`).
All environment variables are documented in `backend/.env.example`.

### Key Variables

| Variable            | Required  | Description                                                                     |
| ------------------- | --------- | ------------------------------------------------------------------------------- |
| `DATABASE_URL`      | ✅ prod   | Async PostgreSQL DSN (`postgresql+asyncpg://...`).                              |
| `JWT_SECRET_KEY`    | ✅ always | ≥32 random bytes. Rotate to invalidate all sessions.                            |
| `FRONTEND_BASE_URL` | ✅ always | Canonical frontend origin (e.g. `https://app.factora.eu`). Used in email links. |
| `CORS_ORIGINS`      | ✅ prod   | Comma-separated origins, or `*` for local dev only.                             |
| `ALLOWED_HOSTS`     | ✅ prod   | Comma-separated hostnames for `TrustedHostMiddleware`.                          |
| `TRUSTED_PROXIES`   | ✅ prod   | Nginx CIDR(s) for `ProxyHeadersMiddleware` (e.g. `172.18.0.0/16`).              |
| `ENVIRONMENT`       | ✅ always | `production` \| `development` \| `demo`.                                        |
| `PEPPER`            | ✅ prod   | Server-side pepper for Argon2id hashing.                                        |

### DEMO_MODE

`settings.demo_mode` is `True` when `ENVIRONMENT=demo`.

When demo mode is active:

- External API calls (AADE, SaltEdge, GEMI) return static JSON fixtures from `app/core/demo_fixtures/`.
- Notification service (Brevo email/SMS) logs messages instead of dispatching.
- Every HTTP response carries an `X-Demo-Mode: true` header (via `DemoModeMiddleware`).

To mock a service function for demo mode, apply the decorator:

```python
from app.core.demo import demo_fixture

@demo_fixture("fixture_key")   # matches a key in demo_fixtures/*.json
async def my_external_call(...):
    ...  # real implementation runs only in production/development
```

</environment_config>

---

<workflow>

## Workflow — The "Forensic" Process

Before writing any code:

1. **Analyze** — identify logic gaps, security implications, and architectural fit.
2. **Plan** — list files to create/modify with a clear description of each change.
3. **Dependency Check**: Identify if these changes affect other domains.
4. **Test Plan** — enumerate Happy Path + Edge Cases (auth failures, missing data, concurrent access).
5. **Execute** — write code following all standards in this file.
6. **Verify & Review**: Perform a "Self-Code-Review" against the .md standards before finishing to ensure changes

</workflow>

---

<output_requirements>

## Output Requirements

Every significant task must conclude with:

1. **Code Review** — self-critique identifying smells, performance bottlenecks, or missing error handling.
2. **QA Report** — list of tests written (Playwright / pytest-asyncio) and their pass/fail status.
3. **Commit Breakdown** — logical atomic commits using semantic prefixes:

```
feat(api):        New endpoint or service
fix(security):    Security patch
refactor(db):     DB model / migration restructure
chore(config):    Config / env var change
docs(claude):     Documentation update
test(qa):         Test additions / fixes
style(frontend):  UI / styling changes
```

</output_requirements>

---

<version_control>

## Version Control Standards

- **Atomic Commits**: one logical concern per commit (schema, service, route, component, test are separate).
- **Semantic Prefixes**: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`.
- **Branch Naming**: propose a branch name before starting (e.g. `feature/jwt-auth-v1`).
- **Never force-push** `main` or `master`.

</version_control>

---

<ai_pytorch>

## AI & PyTorch Best Practices

- **Device Agnostic**:
  ```python
  device = torch.device(
      "cuda" if torch.cuda.is_available()
      else "mps" if torch.backends.mps.is_available()
      else "cpu"
  )
  ```
- **Inference**: always wrap with `with torch.no_grad():` to prevent memory leaks in FastAPI workers.
- **Type Checking**: use `jaxtyping` for tensor shape validation in docstrings.

</ai_pytorch>

---

<never_list>

## The "NEVER" List

- **NEVER** call `AppSettings()` (or `Settings()`) directly — use the shared `settings` singleton from `app.config` or `app.core.config`.
- **NEVER** store any token or password in plaintext — always hash before writing to the DB.
- **NEVER** use `datetime.utcnow()` (deprecated) — use `datetime.now(timezone.utc)`.
- **NEVER** add `pytest` or other test tools to `[project.dependencies]` — use `[dependency-groups]` in `pyproject.toml`.
- **NEVER** put business logic in route files (`api/routes/`) — routes declare endpoints only.
- **NEVER** return `HTTPException` or status codes from a service — raise domain exceptions instead.
- **NEVER** wrap service returns in generic "Result" or "ServiceResponse" objects — always return specific Pydantic DTOs (or None) on the happy path, and rely on domain exceptions for failures.
- **NEVER** use `allow_origins=["*"]` together with `allow_credentials=True` — this violates the CORS spec and will silently break auth in the browser.
- **NEVER** skip the `/v1/` prefix when adding a new router to `main.py`.
- **NEVER** add new ORM models to `db/database_models.py` — add them to the appropriate domain file under `db/models/`.
- **NEVER** hardcode `FRONTEND_BASE_URL`, `JWT_SECRET_KEY`, `PEPPER`, or any secret — all must come from environment variables.
- **NEVER** commit `.env` files or any file containing real secrets.
- **NEVER** use `pip install` — always use `uv add` for backend dependencies.

</never_list>
