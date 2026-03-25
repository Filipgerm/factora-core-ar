import type { Page } from "@playwright/test";

/** Demo-style dashboard payloads (aligned with `lib/schemas/dashboard` + SaltEdge customers). */
export const MOCK_SELLER_METRICS = {
  total_counterparties: 12,
  total_active_alerts: 1,
};

export const MOCK_PL_METRICS = {
  net_cash_flow: 12500.5,
  total_revenue: 88000,
  total_expenses: 42000,
  net_income: 46000,
  average_margin: 0.42,
  balance: 320000,
  currency: "EUR",
  period_days: 30,
  monthly_revenue: [],
  monthly_expenses: [],
  monthly_net_income: [],
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

export function installDashboardHappyPathMocks(page: Page): void {
  page.route("**/v1/dashboard/seller-metrics**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_SELLER_METRICS),
    });
  });
  page.route("**/v1/dashboard/pl-metrics**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_PL_METRICS),
    });
  });
  page.route("**/v1/dashboard/transactions**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_TRANSACTIONS),
    });
  });
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
  });
}

export function installCounterpartiesEmptyMock(page: Page): void {
  page.route("**/v1/organization/counterparties**", async (route) => {
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
