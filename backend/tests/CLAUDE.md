# Testing Standards

> This file is read in addition to the root `CLAUDE.md` and `backend/CLAUDE.md`.
> Architecture and domain rules live in those files. This file covers test
> structure, fixtures, and coverage requirements only.

---

<testing_standards>

## Directory Structure (current)

Tests use a **flat** layout under `unit/` and `integration/` (no nested
`unit/services/` or `integration/api/` folders today):

```
backend/tests/
  conftest.py              ← Shared fixtures; sets dummy env before app import
  unit/                    ← *.py modules (agents, services via mocks, pure helpers)
  integration/             ← *.py modules (HTTP + app stack where present)
```

### Aspirational layout (future)

If the tree grows, nested folders such as `unit/agents/`, `integration/api/` are
fine as long as `pytest` discovery and imports stay explicit. Update this doc when
that split happens.

## Core fixtures (`conftest.py`) — present today

| Fixture        | Role |
| -------------- | ---- |
| `db`           | Fresh `AsyncMock` session-shaped object per test (no real PostgreSQL). |
| `auth_service` | `AuthService` constructed with `db` and a test `code_pepper`. |

Environment variables required by `app.config.Settings` are populated in `conftest.py`
before importing the application (including **Stripe** keys as empty strings for
stub behaviour).

## Target fixtures (not in repo yet)

For full-stack or DB-backed tests, the project may later add:

- `test_db` — real `AsyncSession` in a transaction rolled back per test.
- `client` — `httpx.AsyncClient` against the FastAPI app.
- `auth_headers` / `org_id` — JWT + fixed tenant UUID for multi-tenancy assertions.

When those exist, document them here and require them for new integration suites.

## Coverage requirements

### Every new API endpoint must have tests for:

1. **Success / happy path** — correct input, authenticated, expected response shape.
2. **Unauthenticated request** → `401`.
3. **At least one domain-specific edge case**: missing resource → `404`, duplicate
   → `409`, insufficient permissions → `403`, invalid input → `422`.

### Every new service method that queries business data must have:

- A **multi-tenancy isolation test**: the same query using a different
  `organization_id` must return no results or raise `NotFoundError`. This test is
  not optional.

### Agent nodes (when they emit confidence / review flags)

- A unit test with a mocked LLM response.
- Assertions on `requires_human_review` relative to the threshold in
  `app/agents/base.py`.

Phase 2 ingestion/reconciliation graphs may not expose those fields yet; align
tests with `backend/app/agents/CLAUDE.md` **partial compliance** note.

## Rules

- **Isolation** — every test must be runnable independently. No test may depend on
  state created by another test.
- **No real external calls** — mock `clients/` (Brevo, GEMI, SaltEdge, Gmail),
  **`packages.stripe`** / Stripe entrypoints (e.g. `get_stripe_client` in
  `app.dependencies` when used), and all LLM calls (`pytest-mock`, `unittest.mock`).
  Never hit a real third-party API in CI.
- **Async tests** — `tool.pytest.ini_options.asyncio_mode = "auto"` is set in
  `pyproject.toml`. Still mark async tests with `@pytest.mark.asyncio` for clarity
  and to match project convention.
- **Test dependencies** — `pytest`, `pytest-asyncio`, `pytest-mock`, and `httpx`
  belong in **`[dependency-groups] dev`** in `pyproject.toml`. Never add them to
  `[project.dependencies]`.

## Frontend testing (reference)

- **Component tests** — Vitest + React Testing Library.
- **E2E** — Playwright for critical flows (when `frontend/e2e/` exists).

</testing_standards>

---

<never_list>

## Testing NEVER List

- **NEVER** let one test depend on state created by another test.
- **NEVER** hit a real third-party API (Brevo, GEMI, SaltEdge, OpenAI, Anthropic,
  **Stripe**) in any test — mock `clients/`, `packages.stripe`, and LLM calls.
- **NEVER** skip the multi-tenancy isolation test for a new service method that
  queries business data.
- **NEVER** add `pytest` or test tooling to `[project.dependencies]` — use
  **`[dependency-groups] dev`**.
- **NEVER** commit a test that asserts on response structure without also asserting
  that the same call with a different `organization_id` is properly isolated (when
  the endpoint is tenant-scoped).

</never_list>
