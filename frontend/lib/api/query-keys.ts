export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    session: () => [...queryKeys.auth.all, "session"] as const,
  },
  organization: {
    all: ["organization"] as const,
    me: () => [...queryKeys.organization.all, "me"] as const,
    counterparties: () => [...queryKeys.organization.all, "counterparties"] as const,
  },
  organizations: {
    all: ["organizations"] as const,
    list: () => [...queryKeys.organizations.all, "list"] as const,
  },
  saltedge: {
    all: ["saltedge"] as const,
    customers: (params?: Record<string, string | number | undefined>) =>
      [...queryKeys.saltedge.all, "customers", params ?? {}] as const,
    customer: (id: string) =>
      [...queryKeys.saltedge.all, "customer", id] as const,
    connections: (customerId: string, params?: Record<string, unknown>) =>
      [...queryKeys.saltedge.all, "connections", customerId, params ?? {}] as const,
    connection: (id: string) =>
      [...queryKeys.saltedge.all, "connection", id] as const,
    accounts: (params?: Record<string, string | undefined>) =>
      [...queryKeys.saltedge.all, "accounts", params ?? {}] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
    plMetrics: (params: Record<string, string | number | undefined>) =>
      [...queryKeys.dashboard.all, "pl-metrics", params] as const,
    transactions: (params: Record<string, string | number | undefined>) =>
      [...queryKeys.dashboard.all, "transactions", params] as const,
    sellerMetrics: () => [...queryKeys.dashboard.all, "seller-metrics"] as const,
    aadeDocuments: (params: Record<string, string | number | undefined>) =>
      [...queryKeys.dashboard.all, "aade-documents", params] as const,
    aadeSummary: () => [...queryKeys.dashboard.all, "aade-summary"] as const,
  },
  gemi: {
    all: ["gemi"] as const,
    search: (q: string, mode: string) =>
      [...queryKeys.gemi.all, "search", q, mode] as const,
  },
  mydata: {
    all: ["mydata"] as const,
    docs: (params: Record<string, string | undefined>) =>
      [...queryKeys.mydata.all, "docs", params] as const,
  },
  files: {
    all: ["files"] as const,
  },
  invoices: {
    all: ["invoices"] as const,
    list: (params?: { source?: string }) =>
      [...queryKeys.invoices.all, "list", params ?? {}] as const,
  },
  generalLedger: {
    all: ["general-ledger"] as const,
    entities: () => [...queryKeys.generalLedger.all, "entities"] as const,
    accounts: () => [...queryKeys.generalLedger.all, "accounts"] as const,
    periods: () => [...queryKeys.generalLedger.all, "periods"] as const,
    dimensions: () => [...queryKeys.generalLedger.all, "dimensions"] as const,
    journals: (params: Record<string, unknown>) =>
      [...queryKeys.generalLedger.all, "journals", params] as const,
    journal: (id: string) =>
      [...queryKeys.generalLedger.all, "journal", id] as const,
    journalAudit: (id: string) =>
      [...queryKeys.generalLedger.all, "journal-audit", id] as const,
    billingBatches: () =>
      [...queryKeys.generalLedger.all, "billing-batches"] as const,
    revenueSchedules: (params: Record<string, unknown>) =>
      [...queryKeys.generalLedger.all, "revenue-schedules", params] as const,
    trialBalance: (params: Record<string, unknown>) =>
      [...queryKeys.generalLedger.all, "trial-balance", params] as const,
    recurringTemplates: (params: Record<string, unknown>) =>
      [...queryKeys.generalLedger.all, "recurring-templates", params] as const,
  },
} as const;
