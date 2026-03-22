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
} as const;
