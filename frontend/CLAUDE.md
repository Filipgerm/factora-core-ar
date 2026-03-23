# Frontend Engineering Rules

> This file is read in addition to the root `CLAUDE.md`.
> Domain context, core invariants, and the AI mandate live in the root file.
> This file covers the Next.js application only.

---

<frontend_rules>

## Technology Decisions

| Concern                      | Solution                                    | Rule                                                                  |
| ---------------------------- | ------------------------------------------- | --------------------------------------------------------------------- |
| Server state / data fetching | TanStack Query (React Query v5)             | No `useEffect` + `fetch` patterns for server data. Ever.              |
| Local UI state               | `useState`, `useContext`, URL search params | No external state library (no Zustand, Redux, Jotai, or equivalent).  |
| Filter / pagination state    | URL search params (`useSearchParams`)       | Preferred over `useState` — state is shareable and survives refresh.  |
| API communication            | Custom typed client (`lib/api/`)            | Never call `fetch` directly in components or hooks.                   |
| Forms                        | React Hook Form + Zod resolver              | No `useState` for form fields. No uncontrolled inputs.                |
| Validation schemas           | Zod (`lib/schemas/`)                        | Always export schema and inferred type together.                      |
| Core UI components           | Shadcn/UI                                   | Customize to look premium. Never override internal Tremor structures. |
| Financial charts / KPIs      | Tremor                                      | Exclusively. No other charting library.                               |
| Icons                        | Lucide-React                                | No other icon library permitted.                                      |

## Authentication & Token Storage

| Token         | Storage                                           | Reason                                                                                                 |
| ------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Access token  | **In-memory React context only**                  | Never written to `localStorage`. Lost on refresh — silently renewed by refresh flow. Invisible to XSS. |
| Refresh token | **`httpOnly` + `Secure` + `SameSite=Lax` cookie** | Set by the backend. JS cannot read it under any circumstance. Browser sends it automatically.          |

`lib/api/client.ts` stores the access token in React context (never `localStorage`).
On a `401`, it calls `/v1/auth/refresh`. The browser sends the `httpOnly` cookie
automatically. The client retries the original request once with the new access
token. The client code never reads or writes the refresh token directly.

## Component Placement Rules

| Component type                 | Location                        | Directive                           |
| ------------------------------ | ------------------------------- | ----------------------------------- |
| Page (route entry point)       | `app/(group)/route/page.tsx`    | Server Component                    |
| Layout                         | `app/(group)/layout.tsx`        | Server Component                    |
| Interactive UI (events, state) | `components/`                   | `"use client"`                      |
| Financial charts / KPI widgets | `components/`                   | `"use client"` (Tremor requires it) |
| Pure display, no interactivity | Either; prefer Server Component | No `"use client"` unless necessary  |

**Rule**: Do not add `"use client"` to a component unless it uses browser APIs,
React state, effects, or event handlers. Keep the client boundary as small
as possible.

## Route Structure

```
frontend/
  app/
    layout.tsx               ← Root layout: fonts, global CSS only
    page.tsx                 ← Landing: redirects to /login or /home
    providers.tsx            ← ReactQueryProvider, ThemeProvider, AuthProvider
    (auth)/
      layout.tsx             ← Unauthenticated layout (centered card, no sidebar)
      login/page.tsx
      signup/page.tsx
    (dashboard)/
      layout.tsx             ← Authenticated shell: sidebar, topbar, auth guard
      home/page.tsx
      accounts-receivable/
        layout.tsx           ← Optional nested layout for AR sub-navigation
        products/page.tsx
        invoices/page.tsx
        customers/page.tsx
        credit-memos/page.tsx
        contracts/page.tsx
      accounts-payable/
        vendors/page.tsx
        reimbursements/page.tsx
        charges/page.tsx
        bills/page.tsx
      ar-collections/page.tsx
      reporting/
        vat-return/page.tsx
        income-statement/page.tsx
        executive-metrics/page.tsx
        cash-flow/page.tsx
        balance-sheet/page.tsx
      reconciliation/page.tsx
      integrations/page.tsx
  components/                ← All shared and "use client" components
  lib/
    api/
      client.ts              ← Base client: auth headers, 401 retry, typed ApiError
      invoices.ts            ← Domain-specific typed request functions
      counterparties.ts
      (one file per backend domain)
    schemas/                 ← Zod schemas (one file per domain, mirrors lib/api/)
    utils/                   ← Pure utilities: formatCurrency, formatDate, etc.
  hooks/                     ← Custom React hooks wrapping TanStack Query
  e2e/                       ← Playwright end-to-end tests
```

## API Client Convention

`lib/api/client.ts` is the only place that communicates with the backend.

It is responsible for:

1. Injecting `Authorization: Bearer <token>` from the in-memory auth context.
2. Silently refreshing the access token on `401` before retrying once.
3. Throwing a typed `ApiError` (with `status`, `code`, `message`) on all non-2xx
   responses.

Domain files (`lib/api/invoices.ts`) export plain `async` functions — not classes.
These are the **only** files that call `apiClient`.

```typescript
// ✅ CORRECT — domain API file pattern
export async function getInvoices(orgId: string): Promise<Invoice[]> {
  return apiClient.get(`/v1/invoices`, { params: { org_id: orgId } });
}
```

These functions are consumed exclusively by TanStack Query hooks in `hooks/`.
Components never call `lib/api/` directly — they call a hook.

## Zod Schema Convention

One schema file per domain, mirroring `lib/api/`.
Always export both the schema and the inferred TypeScript type from the same file.
API response types are derived from Zod schemas — never from manually written
`interface` or `type` definitions.

```typescript
// ✅ CORRECT
export const InvoiceSchema = z.object({ ... });
export type Invoice = z.infer<typeof InvoiceSchema>;
```

</frontend_rules>

---

<frontend_aesthetic>

## UI/UX Standards — The Stripe / Rillet Standard

Factora must look and feel like a top-tier modern fintech application.
Reference points: Stripe Dashboard, Rillet, DualEntry.

### Principles

- **Density & Cleanliness** — data tables are dense but use ample whitespace,
  subtle borders (`border-slate-200`), and clean typography (Inter / Geist font).
- **Micro-interactions** — buttons, table rows, and dropdowns always have subtle
  hover states and transitions.
- **Empty States** — never leave a blank screen. Every empty state has: a subtle
  dashed border, a Lucide icon, brief explainer text, and a primary CTA.
- **AI Presence** — AI-suggested content is visually distinct but not noisy. Use
  subtle purple/blue gradients or sparkle icons for "AI-Suggested" actions.
  Low-confidence matches must surface as interactive confirmation prompts — never
  as resolved state.
- **Components** — Shadcn/UI for core primitives (customized to look premium).
  Tremor exclusively for all financial charts, metrics, and KPIs.

### Aesthetic Enforcement Rules

- **NEVER** use hardcoded hex color values — Tailwind palette tokens only
  (`slate-*`, `zinc-*`, `purple-*`, `blue-*`).
- **NEVER** ship a list or table view whose empty state has no icon, no explainer
  text, and no CTA.
- **NEVER** use a raw spinner (`animate-spin` on a bare `div`) as the sole loading
  state for a data-heavy view — use a skeleton that mirrors the loaded layout.
- **NEVER** apply `transition` or `hover` styles without an explicit duration —
  minimum `transition-all duration-200`.
- **NEVER** render AI-suggested content without a visual distinction (purple/blue
  gradient badge or sparkle icon).
- **NEVER** display a low-confidence AI match as resolved — it must be an
  interactive confirmation prompt.
- **NEVER** add a financial chart or KPI widget using anything other than Tremor.

</frontend_aesthetic>

---

<never_list>

## Frontend NEVER List

### Data & State

- **NEVER** call `fetch` directly in a component or hook — always go through `lib/api/`.
- **NEVER** call a `lib/api/` domain function directly from a component — wrap it
  in a TanStack Query hook in `hooks/` first.
- **NEVER** use `useEffect` + `fetch` for server data — use TanStack Query.
- **NEVER** manage filter, pagination, or shareable UI state with `useState` alone —
  prefer URL search params (`useSearchParams`) so state survives refresh and is
  shareable.
- **NEVER** use `useState` to manage form fields — use React Hook Form.

### Authentication

- **NEVER** store the access token in `localStorage` or `sessionStorage` — keep it
  in React context (in-memory only).
- **NEVER** read or write the refresh token in frontend code — it is an `httpOnly`
  cookie managed entirely by the browser and backend.

### Types & Schemas

- **NEVER** write a Zod schema without exporting the inferred TypeScript type
  alongside it in the same file.
- **NEVER** write manual `interface` or `type` definitions for API response shapes
  — derive them from Zod schemas.

### Components & Routing

- **NEVER** add `"use client"` without a specific reason (browser API, React
  state/effects, event handler).
- **NEVER** use `<img>` tags — always `next/image`.
- **NEVER** use `<a>` tags for internal navigation — always `next/link`.
- **NEVER** use any icon library other than Lucide-React.

### Aesthetics

- **NEVER** use hardcoded hex colors — Tailwind palette tokens only.
- **NEVER** ship an empty state without an icon, explainer text, and a CTA.
- **NEVER** add a financial chart or KPI widget without Tremor.
- **NEVER** render AI-suggested content without a visual distinction.
- **NEVER** display a low-confidence AI result as resolved state.

</never_list>
