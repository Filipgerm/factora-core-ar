import { z } from "zod";

/**
 * myDATA document payloads are large and nested; validate the envelope loosely.
 * Tighten per field when a specific UI needs it.
 */
export const requestedDocsResponseSchema = z
  .object({
    continuationToken: z.unknown().optional(),
    invoicesDoc: z.array(z.unknown()).optional(),
    cancelledInvoicesDoc: z.array(z.unknown()).optional(),
    incomeClassificationsDoc: z.array(z.unknown()).optional(),
    expensesClassificationsDoc: z.array(z.unknown()).optional(),
    paymentMethodsDoc: z.array(z.unknown()).optional(),
  })
  .passthrough();

export type RequestedDocsResponse = z.infer<typeof requestedDocsResponseSchema>;
