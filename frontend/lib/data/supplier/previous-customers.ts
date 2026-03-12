import { CUSTOMERS_DATA } from "@/lib/customers-data";
import type { CustomerStatus } from "@/lib/types/supplier-dashboard";

type CustomerLike = {
  id?: string | number;
  email?: string;
  name?: string;
  status?: CustomerStatus;
  lastAlerts?: string[];
  pendingRequest?: {
    type: "credit limit" | "insurance";
    amount?: number;
  } | null;
};

export const PREVIOUS_CUSTOMERS_DATA: CustomerLike[] =
  (CUSTOMERS_DATA ?? []).map((c: any, idx: number) => ({
    ...c,
    status:
      idx % 5 === 0 ? "new" : idx % 7 === 0 ? "pending" : c.status ?? "new",
    lastAlerts: idx % 6 === 0 ? ["overdue_invoice"] : [],
    pendingRequest:
      idx % 8 === 0
        ? { type: "credit limit", amount: 12000 }
        : idx % 9 === 0
        ? { type: "credit limit", amount: 4500 }
        : null,
  })) || [];


