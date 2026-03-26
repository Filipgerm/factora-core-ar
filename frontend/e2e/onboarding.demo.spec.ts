import { expect, test } from "@playwright/test";

import { DEMO_ORG, installE2EAuth } from "./fixtures/auth";
import {
  installCounterpartiesEmptyMock,
  installDashboardHappyPathMocks,
} from "./fixtures/mock-dashboard-api";

test.describe("Onboarding + org create (mocked API)", () => {
  test("submits company form; POST organizations and refresh return 200", async ({
    page,
  }) => {
    await installE2EAuth(page, { organizationId: null });
    await installDashboardHappyPathMocks(page);
    await installCounterpartiesEmptyMock(page);

    const orgPosts: number[] = [];
    const refreshes: number[] = [];

    await Promise.all([
      page.route("**/v1/organizations/**", async (route) => {
        if (route.request().method() === "POST") {
          orgPosts.push(1);
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              organization_id: DEMO_ORG,
              name: "E2E Demo Co",
              vat_number: "123456789",
              country: "GR",
            }),
          });
          return;
        }
        await route.continue();
      }),
      page.route("**/v1/auth/refresh**", async (route) => {
        if (route.request().method() === "POST") {
          refreshes.push(1);
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              access_token: "e2e-refreshed.token",
              token_type: "bearer",
              expires_at: new Date(Date.now() + 3600_000).toISOString(),
              user_id: "00000000-0000-4000-8000-000000000002",
              username: "E2E User",
              email: "e2e@example.test",
              role: "owner",
              organization_id: DEMO_ORG,
              email_verified: true,
              phone_verified: false,
            }),
          });
          return;
        }
        await route.continue();
      }),
    ]);

    await page.goto("/onboarding");

    await page.getByLabel("Company name").fill("E2E Demo Co");
    await page.getByLabel("VAT number").fill("123456789");
    await page.getByLabel("Country code").fill("GR");

    await page.getByRole("button", { name: "Continue" }).click();

    await expect.poll(() => orgPosts.length).toBeGreaterThan(0);
    await expect.poll(() => refreshes.length).toBeGreaterThan(0);

    await expect(page).toHaveURL(/\/home/, { timeout: 20_000 });
  });
});
