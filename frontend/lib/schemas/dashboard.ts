import { z } from "zod";

const monthPoint = z.object({}).passthrough();

export const dashboardMetricsResponseSchema = z.object({
  net_cash_flow: z.number(),
  total_revenue: z.number(),
  total_expenses: z.number(),
  net_income: z.number(),
  average_margin: z.number().nullable().optional(),
  balance: z.number(),
  currency: z.string(),
  period_days: z.number(),
  monthly_revenue: z.array(monthPoint).default([]),
  monthly_expenses: z.array(monthPoint).default([]),
  monthly_net_income: z.array(monthPoint).default([]),
  monthly_margin: z.array(monthPoint).default([]),
});

export const transactionsResponseSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  status: z.string(),
  made_on: z.coerce.string(),
  posted_date: z.coerce.string().nullable().optional(),
  amount: z.number(),
  currency_code: z.string(),
  category: z.string(),
  merchant_id: z.string().nullable().optional(),
  mcc: z.string().nullable().optional(),
  description: z.string(),
  iban: z.string().nullable().optional(),
});

export const sellerMetricsResponseSchema = z.object({
  total_counterparties: z.number(),
  total_active_alerts: z.number(),
});

export const aadeInvoiceItemSchema = z.object({
  id: z.string(),
  document_id: z.string(),
  uid: z.string().nullable().optional(),
  mark: z.number().nullable().optional(),
  authentication_code: z.string().nullable().optional(),
  issuer_vat: z.string().nullable().optional(),
  issuer_country: z.string().nullable().optional(),
  issuer_branch: z.number().nullable().optional(),
  counterpart_vat: z.string().nullable().optional(),
  counterpart_country: z.string().nullable().optional(),
  counterpart_branch: z.number().nullable().optional(),
  series: z.string().nullable().optional(),
  aa: z.string().nullable().optional(),
  issue_date: z.coerce.string().nullable().optional(),
  invoice_type: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  total_net_value: z.union([z.number(), z.string()]).nullable().optional(),
  total_vat_amount: z.union([z.number(), z.string()]).nullable().optional(),
  total_gross_value: z.union([z.number(), z.string()]).nullable().optional(),
  created_at: z.coerce.date(),
});

export const aadeDocumentsResponseSchema = z.object({
  invoices: z.array(aadeInvoiceItemSchema).default([]),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export const partySummarySchema = z.object({
  vat: z.string().nullable().optional(),
  invoice_count: z.number(),
  total_net_value_sum: z.union([z.number(), z.string()]),
  total_vat_amount_sum: z.union([z.number(), z.string()]),
  total_gross_value_sum: z.union([z.number(), z.string()]),
});

export const aadeSummaryResponseSchema = z.object({
  total_net_value_sum: z.union([z.number(), z.string()]),
  total_vat_amount_sum: z.union([z.number(), z.string()]),
  total_gross_value_sum: z.union([z.number(), z.string()]),
  supplier_count: z.number(),
  customer_count: z.number(),
  customer_breakdown: z.array(partySummarySchema).default([]),
  supplier_breakdown: z.array(partySummarySchema).default([]),
});

export type DashboardMetricsResponse = z.infer<
  typeof dashboardMetricsResponseSchema
>;
export type TransactionsResponse = z.infer<typeof transactionsResponseSchema>;
export type SellerMetricsResponse = z.infer<typeof sellerMetricsResponseSchema>;
export type AadeDocumentsResponse = z.infer<typeof aadeDocumentsResponseSchema>;
export type AadeSummaryResponse = z.infer<typeof aadeSummaryResponseSchema>;
