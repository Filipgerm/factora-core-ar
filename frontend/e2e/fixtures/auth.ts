import type { Page } from "@playwright/test";

const DEMO_ORG = "00000000-0000-4000-8000-000000000001";
const DEMO_USER = "00000000-0000-4000-8000-000000000002";

/** Minimal JWT-shaped string for Bearer header when API is mocked. */
function fakeJwt(): string {
  const payload = btoa(
    JSON.stringify({
      sub: DEMO_USER,
      role: "owner",
      organization_id: DEMO_ORG,
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  ).replace(/=/g, "");
  return `e2e.${payload}.sig`;
}

const DEMO_SALTEDGE_CUSTOMER_ID = "demo-customer-se-001";

type E2EProfile = {
  user_id: string;
  username: string;
  email: string;
  role: string;
  organization_id: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  saltedge_customer_id: string | null;
};

/**
 * Install auth before the app bootstraps. AuthSessionProvider reads `window.__E2E_AUTH__` only when
 * the E2E bridge is enabled (non-production, or `NEXT_PUBLIC_ENABLE_E2E_AUTH_BRIDGE=true`).
 */
export async function installE2EAuth(
  page: Page,
  options?: { organizationId?: string | null }
): Promise<void> {
  const organizationId =
    options?.organizationId === undefined ? DEMO_ORG : options.organizationId;
  const token = fakeJwt();
  const profile: E2EProfile = {
    user_id: DEMO_USER,
    username: "E2E User",
    email: "e2e@example.test",
    role: "owner",
    organization_id: organizationId,
    email_verified: true,
    phone_verified: false,
    saltedge_customer_id: organizationId ? DEMO_SALTEDGE_CUSTOMER_ID : null,
  };
  await page.addInitScript(
    (payload: { token: string; profile: E2EProfile }) => {
      window.__E2E_AUTH__ = payload;
    },
    { token, profile }
  );
}

export { DEMO_ORG, DEMO_USER };
