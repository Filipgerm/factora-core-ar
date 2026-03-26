import { expect, test } from "@playwright/test";

import { installE2EAuth } from "./fixtures/auth";
import {
  installCounterpartiesEmptyMock,
  installDashboardHappyPathMocks,
  MOCK_TRANSACTIONS,
} from "./fixtures/mock-dashboard-api";

test.describe("Dashboard happy path (mocked API)", () => {
  test.beforeEach(async ({ page }) => {
    await installE2EAuth(page);
    await installDashboardHappyPathMocks(page);
    await installCounterpartiesEmptyMock(page);
  });

  test("loads home, asserts dashboard GETs return 200, shows greeting and KPI content", async ({
    page,
  }) => {
    const seen = new Map<string, number>();

    page.on("response", (res) => {
      const u = res.url();
      if (u.includes("/v1/dashboard/seller-metrics")) {
        seen.set("seller", res.status());
      }
      if (u.includes("/v1/dashboard/pl-metrics")) {
        seen.set("pl", res.status());
      }
      if (u.includes("/v1/dashboard/transactions")) {
        seen.set("tx", res.status());
      }
    });

    await page.goto("/home");

    await expect(page.getByTestId("home-dashboard-greeting")).toContainText(
      "Hi, E2E"
    );

    await expect.poll(() => seen.get("seller")).toBe(200);
    await expect.poll(() => seen.get("pl")).toBe(200);
    await expect.poll(() => seen.get("tx")).toBe(200);

    await expect(page.getByTestId("dashboard-kpi-bento")).toBeVisible();
    await expect(page.getByText("Total revenue")).toBeVisible();
    await expect(page.getByText(MOCK_TRANSACTIONS[0].description)).toBeVisible();
  });

  test("navigates core sidebar routes without blank root", async ({ page }) => {
    await page.goto("/home");
    await expect(page.locator("main")).toBeVisible();

    await page.getByRole("link", { name: "Cash Reconciliation" }).click();
    await expect(page).toHaveURL(/\/reconciliation/);
    await expect(page.locator("main")).toBeVisible();

    await page.getByRole("link", { name: "Integrations" }).click();
    await expect(page).toHaveURL(/\/integrations/);
    await expect(page.locator("main")).toBeVisible();

    await page.getByRole("button", { name: "Accounts Receivable" }).click();
    await page.getByRole("link", { name: "Invoices", exact: true }).click();
    await expect(page).toHaveURL(/\/accounts-receivable\/invoices/);
    await expect(page.locator("main")).toBeVisible();

    await page.getByRole("button", { name: "Accounts Payable" }).click();
    await page.getByRole("link", { name: "Vendors", exact: true }).click();
    await expect(page).toHaveURL(/\/accounts-payable\/vendors/);
    await expect(page.locator("main")).toBeVisible();
  });
});
