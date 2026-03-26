# Packages — Standalone Integration SDKs

> This file is read in addition to the root `CLAUDE.md`.
> Packages are fully isolated. They must NEVER import from `app/`.

---

<package_rules>

## What Qualifies as a Package

A third-party integration earns package treatment when it meets at least two of:

- Has its own domain-specific data models (not just a response wrapper)
- Uses a non-standard protocol or encoding (XML/XSD, custom binary, etc.)
- Is complex enough to be tested in complete isolation from the main app
- Would meaningfully benefit another project if extracted

**Qualifies → `packages/`**: AADE (XML/XSD tax authority protocol), SaltEdge
(complex Open Banking account/transaction model), **Stripe** (large mirror Pydantic
surface for events and resources, plus webhook signature verification and a stable
serialization contract — similar in spirit to AADE/SaltEdge complexity even though
the wire format is JSON, not XML).

**Does not qualify → `clients/`**: Brevo (standard REST + SDK), GEMI (simple REST
lookup), **Gmail** (OAuth + REST via ``app/clients/gmail_api_client.py`` and
``httpx`` — not a separate published “Gmail SDK” package under ``packages/``),
Supabase Storage (standard SDK).

When in doubt, start in `clients/`. Promote to a package only when the integration
outgrows a single file.

## Internal Folder Convention

```
packages/
  aade/
    api/        ← External API URL definitions and request construction
                  (named "api/", NOT "endpoints/" — avoids confusion with FastAPI routes)
    models/     ← Pydantic schemas specific to AADE data shapes
    xsd/        ← XML Schema Definition files for validation
    xml/        ← XML serializers and deserializers
  saltedge/
    api/        ← External API URL definitions
    models/     ← Pydantic schemas for SaltEdge account/transaction shapes
  stripe/
    api/        ← client.py (SDK wrapper), webhooks.py, serialize.py
    models/     ← Mirror DTOs (common.py, events.py)
```

## Isolation Contract

Packages are **logical** standalone modules: they must behave as if they could be
split into separate distributions, but today they **ship with the monorepo** under
a single [`backend/pyproject.toml`](../pyproject.toml) (`packages.find` includes
`packages*`). They must:

- Never import anything from `app/`. Not `app.config`, not `app.core`, nothing.
  If a package needs configuration (e.g., an API key), it accepts it as a
  constructor argument or environment variable — not by importing `settings`.
- Expose a clean public API from its `__init__.py`. Internal implementation
  details stay internal.
- Remain testable in isolation (no FastAPI app required for package unit tests).

If a package is ever published as its own wheel, add a dedicated `pyproject.toml`
at that time; until then, shared dependencies live in the backend root
`pyproject.toml`.

## Testing Packages

Each package has its own test suite runnable without starting the main app.
Package tests live inside the package directory:

```
packages/
  aade/
    tests/
      test_xml_serializer.py
      test_xsd_validation.py
  saltedge/
    tests/
      test_models.py
```

These are separate from `backend/tests/`. They test protocol correctness —
XML round-trips, schema validation, model parsing — not business logic.

</package_rules>

---

<never_list>

## Packages NEVER List

- **NEVER** import from `app/` inside a package — not config, not core, nothing.
- **NEVER** name a folder `endpoints/` inside a package — use `api/` to avoid
  confusion with FastAPI route endpoints.
- **NEVER** put business rules inside a package — packages are protocol adapters
  only. Business logic belongs in `app/services/`.
- **NEVER** add a new integration directly as a package without confirming it meets
  the qualification criteria above. Default to `clients/` first.

</never_list>
