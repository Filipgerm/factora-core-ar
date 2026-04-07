import { z } from "zod";

export const invoiceSourceSchema = z.enum([
  "manual",
  "aade",
  "ocr_pdf",
  "csv_import",
  "gmail",
]);

export type InvoiceSource = z.infer<typeof invoiceSourceSchema>;

export const invoiceStatusSchema = z.enum([
  "draft",
  "pending_review",
  "finalized",
  "synced",
]);

export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const invoiceAccountingKindSchema = z.enum([
  "ap_expense",
  "ar_revenue",
  "unknown",
]);

export type InvoiceAccountingKind = z.infer<typeof invoiceAccountingKindSchema>;

export const invoiceResponseSchema = z.object({
  id: z.string(),
  organization_id: z.string(),
  source: invoiceSourceSchema,
  external_id: z.string().nullable(),
  counterparty_id: z.string().nullable(),
  counterparty_display_name: z.string().nullable(),
  amount: z.coerce.number(),
  currency: z.string(),
  issue_date: z.string(),
  due_date: z.string().nullable(),
  status: invoiceStatusSchema,
  confidence: z.number().min(0).max(1).nullable(),
  requires_human_review: z.boolean(),
  is_recurring: z.boolean().optional().default(false),
  gl_journal_entry_id: z.string().uuid().nullish(),
  accounting_kind: invoiceAccountingKindSchema.nullish(),
});

export type InvoiceResponse = z.infer<typeof invoiceResponseSchema>;

export const invoiceCreateSchema = z.object({
  source: invoiceSourceSchema.default("manual"),
  external_id: z.string().max(255).nullable().optional(),
  counterparty_id: z.string().uuid().nullable().optional(),
  counterparty_display_name: z.string().max(255).nullable().optional(),
  customer_name: z.string().max(255).nullable().optional(),
  amount: z.coerce.number().positive(),
  currency: z.string().length(3).default("EUR"),
  issue_date: z.string().min(1),
  due_date: z.string().nullable().optional(),
  status: invoiceStatusSchema.default("draft"),
  confidence: z.number().min(0).max(1).nullable().optional(),
  requires_human_review: z.boolean().optional().default(false),
});

export type InvoiceCreate = z.infer<typeof invoiceCreateSchema>;

/** @deprecated Use invoiceCreateSchema / InvoiceCreate */
export const manualInvoiceCreateSchema = invoiceCreateSchema;
/** @deprecated Use invoiceResponseSchema / InvoiceResponse */
export const manualInvoiceResponseSchema = invoiceResponseSchema;
export type ManualInvoiceCreate = InvoiceCreate;
export type ManualInvoiceResponse = InvoiceResponse;

/** Form-only: amount entered as text then coerced for API. */
export const manualInvoiceSheetFormSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required").max(255),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((s) => {
      const n = Number.parseFloat(s.replace(",", "."));
      return Number.isFinite(n) && n > 0;
    }, "Enter a valid amount greater than zero"),
  issue_date: z.string().min(1, "Date is required"),
  currency: z.string().length(3).default("EUR"),
});

export type ManualInvoiceSheetFormValues = z.infer<
  typeof manualInvoiceSheetFormSchema
>;

export function invoiceCreateFromSheet(
  v: ManualInvoiceSheetFormValues
): InvoiceCreate {
  const amount = Number.parseFloat(v.amount.replace(",", "."));
  return invoiceCreateSchema.parse({
    source: "manual",
    counterparty_display_name: v.customer_name,
    amount,
    issue_date: v.issue_date,
    currency: v.currency,
  });
}

/** @deprecated Use invoiceCreateFromSheet */
export const manualInvoiceCreateFromSheet = invoiceCreateFromSheet;
