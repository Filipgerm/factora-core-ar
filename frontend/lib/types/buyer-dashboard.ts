import type { CreditLimitRequest } from "@/lib/credit-limit-requests";

export interface CreditScores {
  bank?: number;
  erp?: number;
  ecommerce?: number;
}

export interface ConnectedServices {
  bank?: boolean;
  bankName?: string;
  erp?: boolean;
  erpName?: string;
  ecommerce?: boolean;
  ecommerceName?: string;
}

export type BuyerCreditLimitRequest = CreditLimitRequest;
