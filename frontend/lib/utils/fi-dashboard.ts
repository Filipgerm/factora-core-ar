import type {
  AlertNotification,
  AnyNotification,
  CustomerStatus,
  NotificationBadgeCounts,
  NotificationExpansionState,
  RequestNotification,
  RiskLevel,
  StatusNotification,
} from "@/lib/types/fi-dashboard";

export const timeAgo = (iso: string): string => {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(1, Math.floor((now - then) / 1000));
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

export const randomPastISO = (): string => {
  const now = Date.now();
  const min = 1 * 60 * 60 * 1000; // 1 hour
  const max = 10 * 24 * 60 * 60 * 1000; // 10 days
  const offset = Math.floor(Math.random() * (max - min)) + min;
  return new Date(now - offset).toISOString();
};

export const uid = (): string => Math.random().toString(36).slice(2);

export const getRiskSeverity = (alertType: AlertNotification["alertType"]): RiskLevel => {
  switch (alertType) {
    case "overdue_invoice":
      return "High";
    case "credit_limit_drop":
      return "Medium";
    case "watchlist_hit":
      return "High";
    case "misc":
    default:
      return "Low";
  }
};

export const getImpactBadgeConfig = (impact: "low" | "medium" | "high") => {
  const config = {
    low: { label: "Low", className: "bg-green-100 text-green-800" },
    medium: { label: "Medium", className: "bg-amber-100 text-amber-800" },
    high: { label: "High", className: "bg-red-100 text-red-800" },
  };
  return config[impact];
};

type CustomerLike = {
  id?: string | number;
  email?: string;
  name?: string;
  businessName?: string;
  status?: CustomerStatus;
  vatNumber?: string;
  alerts?: string[];
  alertsEnabled?: boolean;
  lastAlerts?: string[];
  pendingRequest?: {
    type: "credit limit" | "insurance";
    amount?: number;
  } | null;
};

export const buildNotifications = (
  prev: CustomerLike[],
  curr: CustomerLike[]
): {
  statusEvents: StatusNotification[];
  alertEvents: AlertNotification[];
  requestEvents: RequestNotification[];
} => {
  const prevById = new Map(
    prev.map((c) => [String(c.id ?? c.email ?? c.name), c])
  );

  const statusEvents: StatusNotification[] = [];
  let alertEvents: AlertNotification[] = [];
  const requestEvents: RequestNotification[] = [];

  for (const c of curr) {
    const key = String(c.id ?? c.email ?? c.name);
    const before = prevById.get(key);
    const createdAtISO = randomPastISO();

    const oldStatus: CustomerStatus = (before?.status ?? "new") as CustomerStatus;
    const newStatus: CustomerStatus = (c.status ?? "new") as CustomerStatus;
    if (oldStatus !== newStatus) {
      statusEvents.push({
        id: uid(),
        kind: "status",
        customerId: key,
        businessName: c.businessName ?? "Unknown",
        customerVatNumber: c.vatNumber ?? "",
        createdAt: createdAtISO,
        read: false,
        oldStatus,
        newStatus,
      });
    }

    const currentAlerts: string[] = Array.isArray(c.alerts)
      ? c.alerts
      : c.alertsEnabled
      ? ["watchlist_hit"]
      : [];
    const previousAlerts: string[] = Array.isArray(before?.lastAlerts)
      ? before.lastAlerts
      : [];

    for (const a of currentAlerts) {
      if (!previousAlerts.includes(a)) {
        const alertType: AlertNotification["alertType"] =
          a === "overdue_invoice"
            ? "overdue_invoice"
            : a === "credit_limit_drop"
            ? "credit_limit_drop"
            : a === "watchlist_hit"
            ? "watchlist_hit"
            : "misc";
        alertEvents.push({
          id: uid(),
          kind: "alert",
          customerId: key,
          businessName: c.businessName ?? "Unknown",
          customerVatNumber: c.vatNumber ?? "",
          createdAt: createdAtISO,
          read: false,
          alertType,
          details: getRiskSeverity(alertType),
        });
      }
    }

    const req = c.pendingRequest;
    if (req?.type === "credit limit" || req?.type === "insurance") {
      requestEvents.push({
        id: uid(),
        kind: "request",
        customerId: key,
        businessName: c.businessName ?? "Unknown",
        createdAt: createdAtISO,
        read: false,
        requestType: req.type,
        amount: req.amount,
        details:
          req.type === "credit limit"
            ? "Customer requested credit limit"
            : "Customer requested insurance",
      });
    }
  }

  statusEvents.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  alertEvents.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  alertEvents = alertEvents.slice(0, 3);
  requestEvents.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return { statusEvents, alertEvents, requestEvents };
};

export const getBadgeCounts = (
  totals: NotificationBadgeCounts
): NotificationBadgeCounts => ({
  status: totals.status,
  alerts: Math.min(3, totals.alerts),
  requests: totals.requests,
});

export const getExpandedLists = <T extends AnyNotification>(
  lists: {
    status: T[];
    alerts: T[];
    requests: T[];
  },
  limits: {
    status: number;
    alerts: number;
    requests: number;
  },
  expansion: NotificationExpansionState
) => ({
  status: expansion.status ? lists.status : lists.status.slice(0, limits.status),
  alerts: expansion.alerts ? lists.alerts : lists.alerts.slice(0, limits.alerts),
  requests: expansion.requests
    ? lists.requests
    : lists.requests.slice(0, limits.requests),
});

