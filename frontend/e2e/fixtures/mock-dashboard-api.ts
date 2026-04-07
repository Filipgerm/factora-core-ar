import type { Page } from "@playwright/test";

/** Demo-style dashboard payloads (aligned with `lib/schemas/dashboard` + SaltEdge customers). */
export const MOCK_SELLER_METRICS = {
  total_counterparties: 12,
  total_active_alerts: 1,
};

export const MOCK_PL_METRICS = {
  net_cash_flow: 4_023_000,
  total_revenue: 7_850_000,
  total_expenses: 3_828_800,
  net_income: 4_021_200,
  average_margin: null,
  balance: 11_250_000,
  currency: "EUR",
  period_days: 90,
  monthly_revenue: [
    { month: "2025-11", value: 2_400_000 },
    { month: "2025-12", value: 2_550_000 },
    { month: "2026-01", value: 2_900_000 },
  ],
  monthly_expenses: [
    { month: "2025-11", value: 1_200_000 },
    { month: "2025-12", value: 1_280_000 },
    { month: "2026-01", value: 1_348_800 },
  ],
  monthly_net_income: [
    { month: "2025-11", value: 1_200_000 },
    { month: "2025-12", value: 1_270_000 },
    { month: "2026-01", value: 1_551_200 },
  ],
  monthly_margin: [],
};

export const MOCK_TRANSACTIONS = [
  {
    id: "txn-e2e-1",
    account_id: "acc-1",
    status: "posted",
    made_on: "2025-03-20",
    amount: -49.99,
    currency_code: "EUR",
    category: "software",
    description: "SaaS subscription",
  },
];

export const MOCK_SALTEDGE_CUSTOMERS = {
  data: [{ customer_id: "demo-customer-1", identifier: "e2e" }],
};

export async function installDashboardHappyPathMocks(
  page: Page,
): Promise<void> {
  await Promise.all([
    page.route("**/v1/dashboard/seller-metrics**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_SELLER_METRICS),
      });
    }),
    page.route("**/v1/dashboard/pl-metrics**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_PL_METRICS),
      });
    }),
    page.route("**/v1/dashboard/transactions**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_TRANSACTIONS),
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
        body: JSON.stringify(MOCK_SALTEDGE_CUSTOMERS),
      });
    }),
  ]);
}

export async function installCounterpartiesEmptyMock(
  page: Page,
): Promise<void> {
  await page.route("**/v1/organization/counterparties**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
}
