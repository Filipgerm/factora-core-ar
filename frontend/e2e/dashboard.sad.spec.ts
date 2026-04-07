import { expect, test } from "@playwright/test";

import { installE2EAuth } from "./fixtures/auth";
import {
  installCounterpartiesEmptyMock,
  installDashboardHappyPathMocks,
} from "./fixtures/mock-dashboard-api";

test.describe("Dashboard sad path (network faults)", () => {
  test("500 on seller-metrics shows toast and KPI fallback, not raw JSON", async ({
    page,
  }) => {
    await installE2EAuth(page);
    await installCounterpartiesEmptyMock(page);

    await Promise.all([
      page.route("**/v1/dashboard/seller-metrics**", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Internal Server Error", code: "server" }),
        });
      }),
      page.route("**/v1/dashboard/pl-metrics**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            net_cash_flow: 0,
            total_revenue: 0,
            total_expenses: 0,
            net_income: 0,
            balance: 0,
            currency: "EUR",
            period_days: 180,
          }),
        });
      }),
      page.route("**/v1/dashboard/transactions**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      }),
      page.route("**/v1/saltedge/customers**", async (route) => {
        if (route.request().method() !== "GET") {
          await route.continue();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: [{ customer_id: "c1" }] }),
        });
      }),
    ]);

    await page.goto("/home");

    const dashboardErrorToast = page
      .getByRole("status")
      .filter({ hasText: "Could not load dashboard data" })
      .first();
    await expect(dashboardErrorToast).toBeVisible({ timeout: 15_000 });

    await expect(
      page.getByRole("status").filter({ hasText: /Internal Server Error/ }).first()
    ).toBeVisible();
    await expect(page.getByText(/\{[\s\S]*"detail"/)).toHaveCount(0);
  });

  test("malformed pl-metrics JSON shows KPI fallback without crashing", async ({
    page,
  }) => {
    await installE2EAuth(page);
    await installCounterpartiesEmptyMock(page);

    await Promise.all([
      page.route("**/v1/dashboard/seller-metrics**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ total_counterparties: 0, total_active_alerts: 0 }),
        });
      }),
      page.route("**/v1/dashboard/pl-metrics**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ wrong: true }),
        });
      }),
      page.route("**/v1/dashboard/transactions**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      }),
      page.route("**/v1/saltedge/customers**", async (route) => {
        if (route.request().method() !== "GET") {
          await route.continue();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: [{ customer_id: "c1" }] }),
        });
      }),
    ]);

    await page.goto("/home");

    await expect(
      page
        .getByRole("status")
        .filter({ hasText: /unexpected response from the server/i })
        .first()
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText("Could not load metrics")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("wrong");
  });

  test("slow transactions resolve to activity error panel, not infinite skeleton", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await installE2EAuth(page);
    await installDashboardHappyPathMocks(page);
    await installCounterpartiesEmptyMock(page);

    await page.unroute("**/v1/dashboard/transactions**");
    await page.route("**/v1/dashboard/transactions**", async (route) => {
      await new Promise((r) => setTimeout(r, 11_000));
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Gateway timeout", code: "timeout" }),
      });
    });

    await page.goto("/home", { timeout: 60_000 });

    await expect(page.getByTestId("dashboard-activity-error")).toBeVisible({
      timeout: 45_000,
    });
  });
});
