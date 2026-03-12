export type CustomerStatus = "new" | "pending" | "onboarded";
export type NotificationKind = "status" | "alert" | "request";
export type RequestType = "credit limit" | "insurance";

export type RiskLevel = "High" | "Medium" | "Low";

export type NotificationImpact = "low" | "medium" | "high";

export type BaseNotification = {
  id: string;
  kind: NotificationKind;
  customerId: string | number;
  businessName: string;
  createdAt: string; // ISO string
  read: boolean;
};

export type StatusNotification = BaseNotification & {
  kind: "status";
  oldStatus: CustomerStatus;
  newStatus: CustomerStatus;
  customerVatNumber?: string;
};

export type AlertNotification = BaseNotification & {
  kind: "alert";
  alertType: "credit_limit_drop" | "overdue_invoice" | "watchlist_hit" | "misc";
  details?: string;
  customerVatNumber?: string;
};

export type RequestNotification = BaseNotification & {
  kind: "request";
  requestType: RequestType;
  amount?: number;
  invoiceCount?: number;
  details?: string;
  customerVatNumber?: string;
};

export type AnyNotification =
  | StatusNotification
  | AlertNotification
  | RequestNotification;

export type NotificationExpansionState = {
  status: boolean;
  alerts: boolean;
  requests: boolean;
};

export type NotificationBadgeCounts = {
  status: number;
  alerts: number;
  requests: number;
};

