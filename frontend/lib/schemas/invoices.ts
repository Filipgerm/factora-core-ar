import { z } from "zod";

export const invoiceSourceSchema = z.enum([
  "manual",
  "aade",
  "ocr_pdf",
  "csv_import",
]);

export type InvoiceSource = z.infer<typeof invoiceSourceSchema>;

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
  status: z.string(),
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
  status: z.string().max(32).default("draft"),
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
