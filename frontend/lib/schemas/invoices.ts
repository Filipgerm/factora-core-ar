import { z } from "zod";

export const manualInvoiceCreateSchema = z.object({
  customer_name: z.string().min(1).max(255),
  amount: z.coerce.number().positive(),
  issue_date: z.string().min(1),
  currency: z.string().length(3).default("EUR"),
});

export type ManualInvoiceCreate = z.infer<typeof manualInvoiceCreateSchema>;

export const manualInvoiceResponseSchema = z.object({
  id: z.string(),
  organization_id: z.string(),
  customer_name: z.string(),
  amount: z.coerce.number(),
  issue_date: z.string(),
  currency: z.string(),
});

export type ManualInvoiceResponse = z.infer<typeof manualInvoiceResponseSchema>;

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

export function manualInvoiceCreateFromSheet(
  v: ManualInvoiceSheetFormValues
): ManualInvoiceCreate {
  const amount = Number.parseFloat(v.amount.replace(",", "."));
  return manualInvoiceCreateSchema.parse({
    customer_name: v.customer_name,
    amount,
    issue_date: v.issue_date,
    currency: v.currency,
  });
}
