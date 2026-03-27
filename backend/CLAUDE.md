# Backend Engineering Rules

> This file is read in addition to the root `CLAUDE.md`.
> All domain context, core invariants, and the Forensic Workflow live there.

---

<architecture_rules>

## Architectural Layer Pattern

Every feature must respect this layer separation strictly.
Top = closest to HTTP. Bottom = closest to the database.

```
api/routes/      ← FastAPI route declarations, Pydantic validation, DI only.
                   ZERO business logic. Never touch the DB or instantiate classes here.

controllers/     ← Orchestration layer. Calls services, maps domain exceptions to
                   HTTPException, translates internal models into external *Response DTOs.

services/        ← ALL business logic + DB access via AsyncSession.
                   Returns Domain Models, ORM instances, or internal DTOs.
                   NEVER returns HTTP types, status codes, or external DTOs.

agents/          ← LangGraph agent graphs. Called BY services. Never imports from
                   api/, controllers/, or services/. See backend/app/agents/CLAUDE.md.

clients/         ← Thin wrappers over external HTTP APIs (Brevo, GEMI,
                   Gmail REST via ``gmail_api_client``, Supabase Storage). No business logic. No AsyncSession.

packages/        ← Internal SDKs (AADE, SaltEdge, Stripe). Fully standalone.
                   Must NEVER import from app/. See backend/packages/CLAUDE.md.

db/models/       ← SQLAlchemy ORM models only, split by domain.

models/          ← Pydantic *Request / *Response schemas only. No ORM logic.

core/            ← Cross-cutting utilities: security/, exceptions.py, config.py, demo.py.

middleware/      ← Starlette middleware: request_id, demo. Custom additions go here.
```

### Non-obvious file locations

- `alembic.ini` — lives at `backend/` root, **not** inside `app/`; Alembic commands must be run from `backend/`
- `app/clients/gmail_api_client.py` — Gmail OAuth token refresh + REST wrapper (httpx); this is a `clients/` file, not a `packages/` SDK
- `app/clients/llm_client.py` — single instantiation point for Gemini / OpenAI / Anthropic; never import provider SDKs elsewhere
- `app/clients/storage_client.py` — Supabase Storage / S3 file operations; storage logic never goes in `services/`
- `app/services/embeddings/backend.py` — pgvector embedding provider (Gemini or OpenAI); all embedding calls go through here
- `app/core/security/field_encryption.py` — Fernet encryption for Gmail refresh tokens at rest
- `app/core/security/jwt.py` — JWT encode/decode **and** Gmail OAuth `state` CSRF helpers
- `app/core/demo_fixtures/agents/` — static JSON fixtures returned by `@demo_fixture` in demo mode

**`app/db/database_models.py` has been removed. Never recreate it.**

### Centralized Dependency Injection (`app/dependencies.py`)

All Service and Controller instantiation happens exclusively in `app/dependencies.py`.
Routers never instantiate classes manually.

When adding a new domain (e.g., `Invoices`), update `dependencies.py` in this exact order:

1. Service factory:
   `def get_invoice_service(db: AsyncSession = Depends(get_db)) -> InvoiceService:`
2. Controller factory:
   `def get_invoice_controller(svc: InvoiceService = Depends(get_invoice_service)) -> InvoiceController:`
3. Annotated type aliases:
   `InvSvc = Annotated[InvoiceService, Depends(get_invoice_service)]`
   `InvCtrl = Annotated[InvoiceController, Depends(get_invoice_controller)]`
4. Routers import the `Ctrl` alias and use it as their sole business-logic dependency.

**Invoices vs dashboard:** Persisted AR/AP-style invoices live in `InvoiceService` and the
unified `invoices` table (`source` + `external_id` for idempotent ingest from AADE,
OCR, CSV, or manual UI). `DashboardService` stays a **read aggregator** for KPIs,
SaltEdge transactions, and **AADE document snapshots**—not the system of record for
invoice rows. Keeping invoice writes out of the dashboard service avoids a god-object
service and matches how reconciliation and future agents will reference invoice IDs.

### Module Documentation Standards

Every new or refactored Service and Controller file must open with a Google-style
module docstring containing:

1. **Scope** — one sentence on what this file owns.
2. **Contract** — the data exchange pattern ("Accepts Pydantic requests, returns
   DTOs, raises AppError"). Do not list function signatures.
3. **Flow** — a numbered logic flow for multi-step processes.
4. **Architectural Notes** — specific implementation choices worth flagging
   (e.g., "Uses `run_in_executor` to prevent async loop blocking").

### API Versioning

All routes are mounted under `/v1/` in `app/main.py`. Route files under
`api/routes/` do NOT include the version prefix — it is applied at mount time.
Future breaking changes introduce `/v2/` without removing `/v1/`.

### Error Handling Contract

- **Services** → always `raise` from `app.core.exceptions` (e.g., `AuthError`,
  `NotFoundError`). The global handler in `main.py` converts `AppError` subclasses
  to structured JSON automatically.
- **Controllers** → catch and translate to `fastapi.HTTPException` ONLY for errors
  that do not subclass `AppError` (e.g., third-party SDK errors).
- **Routes** → never catch exceptions. Rely on the controller or global handler.

### Pydantic Schema Naming

- `*Request` — inbound payload validated at the route (e.g., `SignUpRequest`)
- `*Response` — outbound payload returned to the caller (e.g., `AuthResponse`)
- `*DTO` — internal schema passing structured data between Service and Controller
- Never use `ServiceResponse`, `Result`, or any other generic envelope.

</architecture_rules>

---

<security_standards>

## Security Standards

### Authentication & Token Rules

| Token type        | Format           | Storage (DB)     | TTL    | Transport                      |
| ----------------- | ---------------- | ---------------- | ------ | ------------------------------ |
| Access token      | JWT HS256        | Never stored     | 30 min | `Authorization: Bearer` header |
| Refresh token     | Opaque (48-byte) | SHA-256 hash     | 7 days | `httpOnly` cookie              |
| Password reset    | Opaque           | SHA-256 hash     | 1 hour | Email link                     |
| OTP / verify code | Numeric          | SHA-256 + pepper | 10 min | SMS / Email                    |

Use `app.core.security.hashing` exclusively:

- Passwords → `hash_password()` (Argon2id)
- All opaque tokens → `hash_token()` (SHA-256)
- JWT JTI for revocation → `hash_jti()`

### Frontend Token Storage Contract

The frontend stores tokens as follows. Backend endpoints must honour this contract.

| Token         | Frontend storage                              | Why                                              |
| ------------- | --------------------------------------------- | ------------------------------------------------ |
| Access token  | In-memory React context only                  | Never written to localStorage. Invisible to XSS. |
| Refresh token | `httpOnly` + `Secure` + `SameSite=Lax` cookie | JS cannot read it under any circumstance.        |

**Backend rule**: Login, refresh, and Google auth set the refresh token via
`response.set_cookie(key="refresh_token", httponly=True, secure=True,
samesite="lax", path="/v1/auth")` so it is sent to auth endpoints including logout.
Never return the refresh token in the JSON response body.

**Frontend rule**: `lib/api/client.ts` stores the access token in React context.
On a `401`, it calls `/v1/auth/refresh` (browser sends the cookie automatically)
and retries the original request once with the new access token.

### JWT Implementation

- Use `app.core.security.jwt` for all encode/decode operations.
- Access tokens carry: `sub` (user UUID), `role`, `organization_id`, `jti`, `iat`, `exp`.
- Refresh token rotation: delete the old `UserSession` row and insert a new one on every use.
- `require_auth` in `app/dependencies.py` validates Bearer JWTs on protected routes.
- `require_role(*roles)` enforces RBAC on routes that need it.

### RBAC Roles

| Role                  | Description                                 |
| --------------------- | ------------------------------------------- |
| `owner`               | Full access; can connect bank accounts      |
| `admin`               | Can manage org data; cannot connect banking |
| `external_accountant` | Read + limited write; no settings access    |
| `viewer`              | Read-only access to dashboards and reports  |

### OWASP Checklist

- Pydantic validates every inbound input at the route. Zod validates every inbound
  input on the frontend.
- Parameterised queries only — SQLAlchemy ORM prevents SQL injection.
- CORS: `allow_origins=["*"]` with `allow_credentials=True` is forbidden. Using
  `allow_origins=["*"]` without credentials is acceptable in `ENVIRONMENT=development` only.
- `TrustedHostMiddleware` with `ALLOWED_HOSTS` set in production.
- `ProxyHeadersMiddleware` with `TRUSTED_PROXIES` set to your nginx CIDR in production.
- Secrets come exclusively from environment variables.

### Webhook / Pub/Sub push verification

- When a third-party push endpoint is configured to verify callers (e.g. Google Pub/Sub
  OIDC via `GMAIL_PUBSUB_VERIFICATION_AUDIENCE` / `Authorization: Bearer`), **verification
  must not be optional**: if the audience (or equivalent) is set, requests **without** a
  valid `Bearer` token (or wrong scheme) must be **rejected** — never treat “no header” as
  “skip verify.” Run synchronous token verification off the asyncio event loop (e.g.
  `run_in_executor`) so the worker stays responsive.

</security_standards>

---

<database_rules>

## Database Rules

- **Migrations** — every schema change requires an Alembic migration. Run
  `alembic revision --autogenerate`, review the output for dropped tables, column
  type changes, or missing indexes before committing.
- **Never run** `alembic upgrade` against the V1 database instance — V2 targets a
  new Supabase project.
- **AsyncSession** — always use `AsyncSession` from `app.db.postgres`. Never use
  synchronous SQLAlchemy sessions in async routes.
- **Timestamps** — use `utcnow()` from `app.db.models._utils`. Never use
  `datetime.utcnow()` (deprecated).
- **Soft deletes** — use `deleted_at` nullable timestamp columns. Never hard-delete
  financial records or Counterparties.
- **Indexes** — add explicit indexes on all FK columns and all columns used in
  `WHERE` or `ORDER BY` clauses.
- **Multi-tenancy** — every business table carries `organization_id UUID FK →
organizations`. Every service method that accesses business data must filter by
  `organization_id` from the authenticated user's JWT.

</database_rules>

---

<ai_pytorch>

## PyTorch Best Practices

PyTorch is used for custom ML models (document classification, OCR post-processing).
For LLM orchestration, see `backend/app/agents/CLAUDE.md`.

- **Device agnostic** — always resolve device at startup:
  ```python
  device = torch.device(
      "cuda" if torch.cuda.is_available()
      else "mps" if torch.backends.mps.is_available()
      else "cpu"
  )
  ```
- **Inference** — always wrap with `with torch.no_grad():` in FastAPI workers.
- **Shape validation** — use `jaxtyping` in docstrings for tensor shapes.
- **Model loading** — load models once in a FastAPI lifespan event into a
  module-level variable. Never reload per request.

</ai_pytorch>

---

<environment_config>

## Environment Configuration

Canonical config: [`app.config.Settings`](app/config.py) (also importable as `app.core.config`).
See [`backend/.env.example`](.env.example) for copy-paste templates. Below matches every
field on `Settings` (required = no default in code; optional = has a default, often empty string).

### Database and storage

| Variable                     | Required | Description                                                   |
| ---------------------------- | -------- | ------------------------------------------------------------- |
| `SUPABASE_URI`               | ✅       | Async PostgreSQL DSN (`postgresql+asyncpg://...`, port 5432). |
| `SUPABASE_URI_SHARED_POOLER` | ✅       | Pooled async DSN (port 6543).                                 |
| `SUPABASE_URL`               | ✅       | Supabase project URL.                                         |
| `SUPABASE_SECRET_KEY`        | ✅       | Supabase service-role key.                                    |
| `ALEMBIC_DATABASE_URL`       | ✅       | Sync DSN for Alembic (`postgresql+psycopg://...`).            |
| `SUPABASE_BUCKET`            | ✅       | Default storage bucket name.                                  |

### External integrations (non-AI)

| Variable                | Required | Description                             |
| ----------------------- | -------- | --------------------------------------- |
| `GEMH_API_KEY`          | ✅       | GEMI / Greek Business Registry API key. |
| `BREVO_API_KEY`         | ✅       | Brevo REST API key.                     |
| `BREVO_SMTP_KEY`        | ✅       | Brevo SMTP relay key.                   |
| `BREVO_SENDER_EMAIL`    | ✅       | Verified sender email.                  |
| `BREVO_SENDER_NAME`     | ✅       | Display name for outbound mail/SMS.     |
| `AADE_USERNAME`         | ✅       | AADE / myDATA username.                 |
| `AADE_SUBSCRIPTION_KEY` | ✅       | AADE / myDATA subscription key.         |
| `SALTEDGE_APP_ID`       | ✅       | Salt Edge application ID.               |
| `SALTEDGE_SECRET`       | ✅       | Salt Edge secret.                       |

### AI and embeddings

| Variable                 | Required   | Description                                                                       |
| ------------------------ | ---------- | --------------------------------------------------------------------------------- |
| `LLM_PROVIDER`           | ✅         | `gemini`, `openai`, or `anthropic` (Claude).                                      |
| `GEMINI_API_KEY`         | optional\* | Google AI key; required when `LLM_PROVIDER=gemini` (non-demo).                    |
| `GEMINI_CHAT_MODEL`      | optional   | Chat / vision model (e.g. `gemini-2.5-flash`).                                    |
| `GEMINI_EMBEDDING_MODEL` | optional   | Embedding model when `EMBEDDING_PROVIDER=gemini` (e.g. `text-embedding-004`).     |
| `OPENAI_API_KEY`         | optional\* | Required when `LLM_PROVIDER=openai` or `EMBEDDING_PROVIDER=openai`.               |
| `OPENAI_CHAT_MODEL`      | optional   | Chat model when `LLM_PROVIDER=openai`.                                            |
| `OPENAI_EMBEDDING_MODEL` | optional   | Embedding model when `EMBEDDING_PROVIDER=openai` (e.g. `text-embedding-3-small`). |
| `ANTHROPIC_API_KEY`      | optional\* | Required when `LLM_PROVIDER=anthropic`.                                           |
| `ANTHROPIC_CHAT_MODEL`   | optional   | Claude model id when `LLM_PROVIDER=anthropic`.                                    |
| `EMBEDDING_PROVIDER`     | ✅         | `gemini` or `openai`.                                                             |
| `EMBEDDING_DIMENSIONS`   | optional   | Vector width; must match DB column (default `768`).                               |

### Stripe

| Variable                | Required | Description                                              |
| ----------------------- | -------- | -------------------------------------------------------- |
| `STRIPE_SECRET_KEY`     | optional | Secret key; empty uses stub behaviour where implemented. |
| `STRIPE_WEBHOOK_SECRET` | optional | Webhook signing secret.                                  |
| `STRIPE_API_VERSION`    | optional | Pinned API version string (must match Stripe dashboard). |

### Gmail (OAuth + Pub/Sub) and outbound mail

| Variable                             | Required   | Description                                                                      |
| ------------------------------------ | ---------- | -------------------------------------------------------------------------------- |
| `GOOGLE_GMAIL_REDIRECT_URI`          | optional\* | OAuth redirect for **Connect Gmail** (separate consent from Sign-In).            |
| `GMAIL_TOKEN_ENCRYPTION_KEY`         | optional\* | Fernet key (urlsafe base64) for encrypted refresh tokens at rest.                |
| `GMAIL_PUBSUB_VERIFICATION_AUDIENCE` | optional   | Expected OIDC audience for Pub/Sub push JWT verification (prod).                 |
| _(collections)_                      | —          | AR collections nudges use **Brevo** (`BREVO_*`); Gmail API send is not used yet. |

### Security and OAuth

| Variable               | Required   | Description                                                  |
| ---------------------- | ---------- | ------------------------------------------------------------ |
| `CODE_PEPPER`          | ✅         | Server pepper for Argon2 (≥16 chars).                        |
| `JWT_SECRET_KEY`       | ✅         | HS256 signing key (≥32 random bytes).                        |
| `GOOGLE_CLIENT_ID`     | optional\* | Google OAuth client ID. \*Required to enable Google Sign-In. |
| `GOOGLE_CLIENT_SECRET` | optional\* | Google OAuth secret; never expose to clients.                |

### URLs and environment

| Variable            | Required | Description                                        |
| ------------------- | -------- | -------------------------------------------------- |
| `FRONTEND_BASE_URL` | ✅       | Canonical frontend origin for email links.         |
| `ENVIRONMENT`       | optional | `production` (default) \| `development` \| `demo`. |

### HTTP middleware

| Variable          | Required | Description                                               |
| ----------------- | -------- | --------------------------------------------------------- |
| `CORS_ORIGINS`    | optional | Comma-separated origins; empty denies CORS in production. |
| `TRUSTED_PROXIES` | optional | Proxy CIDRs for `ProxyHeadersMiddleware` (default `*`).   |
| `ALLOWED_HOSTS`   | optional | Host allowlist for `TrustedHostMiddleware` (default `*`). |

Computed on `settings`: `demo_mode`, `is_production`, `is_development` (derived from `ENVIRONMENT`).

### DEMO_MODE

`settings.demo_mode` is `True` when `ENVIRONMENT=demo`.

- **Domain data** → PostgreSQL; seed with `scripts/seed_demo_db.py` (`ENVIRONMENT=demo` or `ALLOW_DEMO_SEED=1`).
- **AADE / SaltEdge / GEMI HTTP** → static JSON from `core/demo_fixtures/` inside the respective clients (`packages/aade/api/docs.py`, `packages/saltedge/http.py`, `app/clients/gemi_client.py`).
- **Agents** → optional `@demo_fixture` + `core/demo_fixtures/agents/`
- Brevo email/SMS → logged, not dispatched
- Every response carries `X-Demo-Mode: true` header

Do not use `@demo_fixture` on internal services for dashboard, counterparties, or other DB-backed reads — use a seeded database instead.

</environment_config>

---

<version_control>

## Version Control Standards

### Semantic Commit Format

```
<prefix>(<scope>): <short description>

Prefixes : feat | fix | refactor | test | docs | style | chore
Scope    : Required. Use the domain or layer.
```

**Examples:**

```
feat(invoices):       Add bulk PDF export endpoint
fix(auth):            Correct refresh token rotation race condition
refactor(agents):     Extract LLM factory into base.py
test(reconciliation): Add multi-tenancy isolation assertion
docs(claude):         Update agents architecture section
style(dashboard):     Apply Tremor card layout to KPI widgets
chore(config):        Add TRUSTED_PROXIES to .env.example
```

### Rules

- **Atomic** — one logical concern per commit. Schema, service, route, component,
  and tests are always separate commits.
- **Scope required** — omitting the scope is a standards violation.
- **Branch naming** — propose a branch name before starting
  (e.g., `feat/invoice-bulk-export`, `refactor/agents-base`).
- **Cadence** — commit after every self-contained unit. A session ending with
  uncommitted work is a standards violation.
- **Never force-push** `main` or `master`.

</version_control>

---

<output_requirements>

## Output Requirements

Every significant task concludes with:

1. **Code Review** — self-critique: smells, performance bottlenecks, missing error
   handling.
2. **QA Report** — tests written (pytest-asyncio / Playwright) and their status.
3. **Commit Breakdown** — the atomic commits for this task using the format in
   `<version_control>` above.

</output_requirements>

---

<never_list>

## The Backend NEVER List

### Architecture

- **NEVER** put business logic in `api/routes/` files.
- **NEVER** return `HTTPException` or status codes from a service — raise `AppError`
  subclasses and let the global handler convert them.
- **NEVER** return external `*Response` DTOs from a service — return internal DTOs,
  ORM instances, or domain models. Controllers do the translation.
- **NEVER** wrap service returns in `ServiceResponse`, `Result`, or any generic
  envelope.
- **NEVER** skip the `/v1/` prefix when mounting a new router in `main.py`.
- **NEVER** add ORM models to a backwards-compat shim — add them to the correct
  domain file under `db/models/`.
- **NEVER** let agents import from `api/`, `controllers/`, or `services/`.
- **NEVER** put storage logic (Supabase Storage, S3) in `services/` — it belongs
  in `clients/storage_client.py`.

### Security

- **NEVER** store any token or password in plaintext — hash before writing to the DB.
- **NEVER** use `allow_origins=["*"]` with `allow_credentials=True`.
- **NEVER** return the refresh token in a JSON response body — set it as an
  `httpOnly` cookie exclusively.
- **NEVER** hardcode `JWT_SECRET_KEY`, `CODE_PEPPER`, `GOOGLE_CLIENT_SECRET`, or
  any secret — environment variables only.
- **NEVER** commit `.env` files or any file containing real secrets.
- **NEVER** query business data without filtering by `organization_id`.
- **NEVER** skip webhook caller verification when it is configured (e.g. OIDC audience set
  for Pub/Sub): missing or non-`Bearer` `Authorization` must fail closed with `401`/`403`,
  not bypass verification.

### Database

- **NEVER** use `datetime.utcnow()` — use `datetime.now(timezone.utc)`.
- **NEVER** run `alembic upgrade` against the V1 Supabase instance.
- **NEVER** hard-delete financial records or Counterparties.

### Python Tooling

- **NEVER** call `AppSettings()` or `Settings()` directly — use the `settings`
  singleton from `app.config` or `app.core.config`.
- **NEVER** use `pip install` — always `uv add`.
- **NEVER** add `pytest` or test tooling to `[project.dependencies]` — use
  `[dependency-groups.test]` in `pyproject.toml`.

</never_list>
