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
- **Google OAuth**: Sign-in via Google ID token (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`).

</tech_stack>

---

<domain_context>

## Business Domain, Vocabulary & Vision (Factora)

Factora is an **AI-native ERP and financial platform**. While the MVP launches in the Greek market (handling local compliance like AADE/myDATA), the architecture is built for **Pan-European scale**.

### The AI-Native Mandate

Factora does not just use AI; it is built _around_ AI. The system must reimagine traditional accounting workflows through LLMs and agentic AI. When designing features, always consider how AI can eliminate manual data entry and cognitive load for the user.

- **Core AI Workflows:** Automated AR/AP (Accounts Receivable/Payable) reconciliation, business bank transactions contextualization, smart journal entry generation, unstructured invoice data extraction, and AI-drafted vendor/customer email communications.
- **Architecture:** AI logic, embeddings, and LLM calls should be treated as first-class citizens in the Service layer.

### Core Entities

- **User**: A physical person logging into the platform.
- **Organization**: The legal business entity (the "Tenant"). **Multiple Users can belong to a single Organization**, managed via Role-Based Access Control (RBAC).
- **Counterparty**: Another business that the Organization interacts with. Can be a `CUSTOMER` (issues invoices to), a `VENDOR` (receives bills from), or `BOTH`.
- **GEMI**: The Greek Commercial Registry. Used during the MVP onboarding to auto-fetch company data via VAT number (built to be swapped with other European registries later).
- **AADE / myDATA**: The Greek Tax Authority for the MVP. All Greek invoices must sync here using strict XML formats, serving as the blueprint for future European e-invoicing integrations (e.g., Peppol).

### Core Invariants (Unbreakable Business Rules)

1. **Multi-Tenancy Isolation**: Every database query for business data (Counterparties, Invoices, Bank Accounts) MUST filter by `organization_id`. A user must NEVER see another organization's data.
2. **Soft Deletion**: Financial records and Counterparties are never hard-deleted. They use `deleted_at` timestamps to preserve historical audit trails.
3. **Immutability**: Once an Invoice is finalized or synced to a tax authority, its core financial fields (amounts, VAT) cannot be altered.

</domain_context>

---

<architecture_rules>

## Architectural Layer Pattern

Every feature must respect the following layer separation (top = closest to HTTP, bottom = closest to DB):

```
api/routes/      ← FastAPI route declarations, Pydantic validation, DI only. ZERO business logic. NEVER touch the DB or instantiate classes here.
controllers/     ← Orchestration: calls services, maps domain exceptions → HTTPException, translates internal models into external *Response DTOs.
services/        ← ALL business logic + DB access via AsyncSession. Returns Domain Models, ORM instances, or internal DTOs. NEVER return HTTP types or external DTOs.
clients/         ← Thin wrappers over external HTTP APIs (Brevo, GEMI). No business logic.
packages/        ← Internal SDKs (AADE, SaltEdge). Standalone — must NEVER import from app/.
db/models/       ← SQLAlchemy ORM models only (split by domain: identity, counterparty, banking, aade, alerts).
models/          ← Pydantic *Request / *Response schemas only. No ORM logic.
core/            ← Cross-cutting utilities: security/, exceptions.py, config.py, demo.py.
middleware/      ← Starlette middleware: request_id, demo, (custom additions here).
```

### Centralized Dependency Injection (`app/dependencies.py`)

All instantiation of Services and Controllers MUST happen inside `app/dependencies.py`. Routers must never instantiate classes manually.

When adding a new domain (e.g., `Invoices`), you **MUST** update `dependencies.py` in this exact order:

1. Create a Service factory: `def get_invoice_service(db) -> InvoiceService:`
2. Create a Controller factory: `def get_invoice_controller(service) -> InvoiceController:`
3. Create the Annotated type aliases:
   `InvSvc = Annotated[InvoiceService, Depends(get_invoice_service)]`
   `InvCtrl = Annotated[InvoiceController, Depends(get_invoice_controller)]`
4. Routers must import the `Ctrl` alias from `dependencies.py` and use it as the sole dependency for business logic.

### Module Documentation Standards

When creating or refactoring core Service or Controller files, always include a module-level Google-style docstring at the top of the file:

1. **Scope:** A one-sentence summary of the file's responsibility.
2. **Contract:** Define the overarching data exchange pattern (e.g., "Accepts Pydantic requests, returns DTOs, raises AppError"). Do NOT list exhaustive function signatures here.
3. **Flow Diagrams:** For multi-step processes, provide a numbered list of the logic flow.
4. **Architectural Notes:** Mention specific implementation choices (e.g., "Using `run_in_executor` to prevent async loop blocking").

### API Versioning

All routes must be mounted under the `/v1/` prefix in `app/main.py`. Future breaking changes
introduce `/v2/` routes without removing `/v1/`. Route files under `api/routes/` do NOT include
the version prefix themselves — it is applied at mount time.

### Error Handling Contract

- **Services**: always `raise` domain exceptions from `app.core.exceptions` (e.g. `AuthError`, `NotFoundError`).
  The global `@app.exception_handler(AppError)` in `main.py` converts them to structured JSON automatically.
- **Controllers**: catch service exceptions and translate them into `fastapi.HTTPException` with appropriate status codes
  only for errors that don't subclass `AppError` (e.g. third-party SDK errors).
- **Routes**: never catch exceptions — rely on the controller or global handler contract.

### DB Models Location

ORM models live in `app/db/models/` split by domain:

- `identity.py` → `Organization`, `User` (with `UserRole`), `UserSession`
- `counterparty.py` → `Counterparty`, `CounterpartyType`
- `banking.py` → `CustomerModel`, `ConnectionModel`, `BankAccountModel`, `Transaction`
- `aade.py` → `AadeDocumentModel`, `AadeInvoiceModel`
- `alerts.py` → `Alert`, `AlertSeverity`

`app/db/database_models.py` has been removed. Never recreate it.

### Pydantic Schema Naming Convention

- `*Request` — inbound payload validated on the route (e.g. `SignUpRequest`, `OrganizationSetupRequest`)
- `*Response` — outbound payload returned to the caller (e.g. `AuthResponse`, `BusinessResponse`)
- `*Model` or `*DTO` — internal schemas used purely to pass structured data between Services and Controllers (if an ORM instance isn't sufficient).
- Never use generic envelopes like `ServiceResponse` or `Result` — always return a specific DTO.

</architecture_rules>

---

<security_standards>

## Security Standards

### Authentication & Tokens

| Token type              | Format           | Storage (DB)     | TTL    | Transport                            |
| ----------------------- | ---------------- | ---------------- | ------ | ------------------------------------ |
| Access token            | JWT HS256        | **Never stored** | 30 min | `Authorization: Bearer` header       |
| Refresh token           | Opaque (48-byte) | SHA-256 hash     | 7 days | httpOnly cookie or secure body field |
| Password reset token    | Opaque           | SHA-256 hash     | 1 hour | Email link                           |
| OTP / verification code | Numeric          | SHA-256+pepper   | 10 min | SMS / Email                          |

**Rule**: NEVER store any token or password in plaintext. Use `app.core.security.hashing`:

- Passwords → `hash_password()` (Argon2id).
- All opaque tokens → `hash_token()` (SHA-256).
- JWT JTI for revocation checks → `hash_jti()`.

### JWT Implementation

- Use `app.core.security.jwt` for all JWT encode/decode operations.
- Access tokens carry: `sub` (user UUID), `role`, `organization_id`, `jti`, `iat`, `exp`.
- Refresh token rotation: on each use, delete the old `UserSession` row and insert a new one.
- The `require_auth` dependency in `app/dependencies.py` validates Bearer JWTs on protected routes.
- The `require_role(*roles)` dependency factory enforces RBAC (Owner, Admin, External_Accountant, Viewer).

### RBAC Roles

| Role                  | Description                                 |
| --------------------- | ------------------------------------------- |
| `owner`               | Full access; can connect bank accounts      |
| `admin`               | Can manage org data; cannot connect banking |
| `external_accountant` | Read + limited write; no settings access    |
| `viewer`              | Read-only access to dashboards and reports  |

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

- **Migrations**: every schema change requires an Alembic migration file. Run `alembic revision --autogenerate` and review the output and check for dropped tables, column type changes, or missing indexes before committing. **Do not run migrations against the old DB instance** — the V2 schema targets a new Supabase project.
- **Async sessions**: always use `AsyncSession` from `app.db.postgres`. Never use synchronous SQLAlchemy sessions in async routes.
- **Timestamps**: use `utcnow()` from `app.db.models._utils` (wraps `datetime.now(timezone.utc)`). NEVER use `datetime.utcnow()` (deprecated).
- **Soft deletes**: prefer `deleted_at` nullable timestamp columns over hard deletes for audit trails (e.g. `Counterparty.deleted_at`).
- **Indexes**: add explicit indexes on all FK columns and columns used in `WHERE` / `ORDER BY` clauses.
- **Multi-tenancy**: every business table must carry `organization_id UUID FK → organizations`. All service queries must filter by `organization_id` obtained from the authenticated user's JWT.

</database_rules>

---

<environment_config>

## Environment Configuration

The canonical config class is `app.config.Settings` (also importable from `app.core.config`).
All environment variables are documented in `backend/.env.example`.

### Key Variables

| Variable               | Required  | Description                                                                     |
| ---------------------- | --------- | ------------------------------------------------------------------------------- |
| `SUPABASE_URI`         | ✅ always | Async PostgreSQL DSN (`postgresql+asyncpg://...`).                              |
| `JWT_SECRET_KEY`       | ✅ always | ≥32 random bytes. Rotate to invalidate all sessions.                            |
| `FRONTEND_BASE_URL`    | ✅ always | Canonical frontend origin (e.g. `https://app.factora.eu`). Used in email links. |
| `CORS_ORIGINS`         | ✅ prod   | Comma-separated origins, or `*` for local dev only.                             |
| `ALLOWED_HOSTS`        | ✅ prod   | Comma-separated hostnames for `TrustedHostMiddleware`.                          |
| `TRUSTED_PROXIES`      | ✅ prod   | Nginx CIDR(s) for `ProxyHeadersMiddleware` (e.g. `172.18.0.0/16`).              |
| `ENVIRONMENT`          | ✅ always | `production` \| `development` \| `demo`.                                        |
| `CODE_PEPPER`          | ✅ always | Server-side pepper for Argon2id hashing (≥16 chars).                            |
| `GOOGLE_CLIENT_ID`     | ✅ always | Google OAuth 2.0 client ID for Google Sign-In.                                  |
| `GOOGLE_CLIENT_SECRET` | ✅ always | Google OAuth 2.0 client secret (never exposed to the client).                   |

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

Fixture keys must match filenames in `app/core/demo_fixtures/` (without `.json`). If you add a new
external integration, add a corresponding fixture file AND decorate the relevant service method.

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
6. **Commit as you go** — after completing each self-contained logical unit (a new ORM model, a
   refactored service, a new route file), stage and commit immediately using the semantic prefix
   format below. **Never accumulate more than one logical concern before committing.** A session
   that ends without commits is a workflow violation.
7. **Verify & Review**: Perform a "Self-Code-Review" against the .md standards before finishing.

</workflow>

---

<innovation_clause>

## Innovation & Principal Engineer Mindset

When you identify an opportunity to write materially cleaner, faster, or more correct code using
a pattern or library not currently in use, follow this protocol:

1. **Propose first**: In a short paragraph, describe the optimization, its concrete benefit
   (latency, correctness, DX, security), and any trade-offs or migration effort.
2. **Respect the core**: Your proposal must still obey `<never_list>` and `<architecture_rules>`
   unless the user explicitly authorizes an exception.
3. **One proposal per session**: Surface the single highest-value opportunity per conversation;
   do not pad the response with minor stylistic preferences.

Examples of **valid** proposals:

- Replacing raw `httpx` calls in `clients/` with `stamina` for structured retries + exponential backoff.
- Adding `logfire` (Pydantic's OpenTelemetry logger) for structured tracing instead of plain `logging`.
- Using `psycopg3`'s native JSONB adapter instead of `json.dumps` for JSONB columns — avoids a serialization round-trip.
- Introducing `pytest-asyncio` fixtures with an in-memory SQLite database for faster unit tests.

Examples of **invalid** proposals (do not surface):

- "Let's rewrite the backend in Go / Litestar / Django" (breaks the architecture contract).
- Stylistic renames with no functional benefit.
- Adding a new dependency to solve a problem already handled by an existing one.

</innovation_clause>

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
- **Commit cadence**: commit after _every_ self-contained unit of work — do not batch unrelated changes
  into one commit. If a session ends with uncommitted work, that is a standards violation.
- **Semantic Prefixes**: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`.
- **Scope required**: always include a scope in parentheses — e.g. `feat(auth):`, `refactor(db):`,
  `fix(services):`. Omitting the scope makes the log unreadable.
- **Branch Naming**: propose a branch name before starting (e.g. `refactor/v2-domain-model`).
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
- **NEVER** return `HTTPException` or status codes from a service — raise `AppError` subclasses instead.
- **NEVER** return external API `*Response` DTOs from a service. Services must return strongly-typed Domain Models, ORM instances, or internal typed DTOs. Controllers are responsible for translating these internal returns into the final external Pydantic `*Response` DTOs.
- **NEVER** wrap service returns in generic "Result" or "ServiceResponse" objects — rely strictly on domain exceptions from `app.core.exceptions` for failures.
- **NEVER** use `allow_origins=["*"]` together with `allow_credentials=True` — this violates the CORS spec and will silently break auth in the browser.
- **NEVER** skip the `/v1/` prefix when adding a new router to `main.py`.
- **NEVER** add new ORM models to a backwards-compat shim — add them to the appropriate domain file under `db/models/`.
- **NEVER** hardcode `FRONTEND_BASE_URL`, `JWT_SECRET_KEY`, `CODE_PEPPER`, `GOOGLE_CLIENT_SECRET`, or any secret — all must come from environment variables.
- **NEVER** commit `.env` files or any file containing real secrets.
- **NEVER** use `pip install` — always use `uv add` for backend dependencies.
- **NEVER** query the database without filtering by `organization_id` in multi-tenant contexts — every service method that accesses business data must scope queries to the current organization.
- **NEVER** run `alembic upgrade` against the original V1 database instance — V2 migrations target a new Supabase project.

</never_list>
