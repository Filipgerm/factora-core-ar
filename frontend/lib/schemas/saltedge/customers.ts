import { z } from "zod";

import { metaObjectSchema } from "@/lib/schemas/saltedge/common";

export const customerSchema = z
  .object({
    customer_id: z.string().nullable().optional(),
    identifier: z.string().nullable().optional(),
    categorization_type: z.string().nullable().optional(),
    blocked_at: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
  })
  .passthrough();

export const customersResponseSchema = z.object({
  data: z.array(customerSchema),
  meta: metaObjectSchema.nullable().optional(),
});

export const customerResponseSchema = z.object({
  data: customerSchema,
});

export type SaltEdgeCustomer = z.infer<typeof customerSchema>;
export type CustomerResponse = z.infer<typeof customerResponseSchema>;
export type CustomersResponse = z.infer<typeof customersResponseSchema>;
