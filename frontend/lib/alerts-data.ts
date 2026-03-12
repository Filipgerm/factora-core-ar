export type AlertType = "critical" | "warning" | "info";
export type AlertCategory =
  | "overdue_invoice"
  | "credit_limit"
  | "payment_trend"
  | "discount_opportunity";

export interface EconomicBehaviorEvent {
  type:
    | "bounced_check"
    | "unpaid_bill"
    | "payment_delay"
    | "check_payment"
    | "late_payment";
  date: string;
  description: string;
  amount?: string;
  impact: "low" | "medium" | "high";
}

export interface CompanyUpdate {
  type:
    | "balance_sheet"
    | "financial_statement"
    | "capital_change"
    | "liquidity_change";
  date: string;
  description: string;
  details?: string;
}

export interface RegistryAnnouncement {
  type:
    | "board_change"
    | "shareholder_change"
    | "legal_entity"
    | "address_change"
    | "activity_change";
  date: string;
  description: string;
  registry: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  category: AlertCategory;
  customerId: number;
  customerVatNumber: string;
  customerName: string;
  customerBusinessName: string;
  title: string;
  description: string;
  createdAt: string;
  severity: number; // 1-10 scale
  invoiceId?: string;
  invoiceAmount?: string;
  daysOverdue?: number;
  creditLimitUsed?: number; // percentage
  suggestedDiscount?: number; // percentage
  potentialCashAcceleration?: string; // amount in euros
  paymentTerms?: string;
  lastPaymentDate?: string;
  avgDaysToPay?: number;
  trendDirection?: "increasing" | "decreasing" | "stable";
  // Detailed information
  economicBehavior?: {
    summary: string;
    events: EconomicBehaviorEvent[];
    paymentPattern?: {
      current: number;
      previous: number;
      trend: "improving" | "worsening" | "stable";
    };
  };
  companyUpdates?: CompanyUpdate[];
  registryAnnouncements?: RegistryAnnouncement[];
}

import alertsDataRaw from "./data/alerts-data.json";

export const ALERTS_DATA: Alert[] = alertsDataRaw as Alert[];

export const getAlertsByType = (type: AlertType): Alert[] =>
  ALERTS_DATA.filter((alert) => alert.type === type);

export const getAlertsByCategory = (category: AlertCategory): Alert[] =>
  ALERTS_DATA.filter((alert) => alert.category === category);

export const getAlertsByCustomer = (customerVatNumber: string): Alert[] =>
  ALERTS_DATA.filter((alert) => alert.customerVatNumber === customerVatNumber);

export const getCriticalAlerts = (): Alert[] =>
  ALERTS_DATA.filter((alert) => alert.type === "critical");

export const getDiscountOpportunities = (): Alert[] =>
  ALERTS_DATA.filter((alert) => alert.category === "discount_opportunity");

export const calculateTotalPotentialCashAcceleration = (): string => {
  const total = ALERTS_DATA.reduce((sum, alert) => {
    if (alert.potentialCashAcceleration) {
      const amount = parseFloat(
        alert.potentialCashAcceleration.replace("€", "").replace(/,/g, "")
      );
      return sum + amount;
    }
    return sum;
  }, 0);
  return `€${total.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const searchAlerts = (alerts: Alert[], searchTerm: string): Alert[] => {
  if (!searchTerm) return alerts;
  const term = searchTerm.toLowerCase();
  return alerts.filter(
    (alert) =>
      alert.customerName.toLowerCase().includes(term) ||
      alert.customerBusinessName.toLowerCase().includes(term) ||
      alert.title.toLowerCase().includes(term) ||
      alert.description.toLowerCase().includes(term) ||
      alert.customerVatNumber.toLowerCase().includes(term) ||
      (alert.invoiceId && alert.invoiceId.toLowerCase().includes(term))
  );
};

export const filterAlerts = (
  alerts: Alert[],
  filters: {
    type?: AlertType;
    category?: AlertCategory;
    customerVatNumber?: string;
  }
): Alert[] => {
  return alerts.filter((alert) => {
    if (filters.type && alert.type !== filters.type) return false;
    if (filters.category && alert.category !== filters.category) return false;
    if (
      filters.customerVatNumber &&
      alert.customerVatNumber !== filters.customerVatNumber
    )
      return false;
    return true;
  });
};
