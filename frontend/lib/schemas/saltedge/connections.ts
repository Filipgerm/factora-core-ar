import { z } from "zod";

import { metaObjectSchema } from "@/lib/schemas/saltedge/common";

export const connectionSchema = z
  .object({
    id: z.string(),
    customer_id: z.string(),
    customer_identifier: z.string(),
    provider_code: z.string(),
    provider_name: z.string(),
    country_code: z.string(),
    status: z.string(),
    automatic_refresh: z.boolean(),
    created_at: z.coerce.string(),
    updated_at: z.coerce.string(),
    last_consent_id: z.string(),
  })
  .passthrough();

export const connectionsResponseSchema = z.object({
  data: z.array(connectionSchema),
  meta: metaObjectSchema.nullable().optional(),
});

export const connectionActionResponseSchema = z.object({
  data: z.object({
    connect_url: z.string(),
    token: z.string(),
  }),
});

export type SaltEdgeConnection = z.infer<typeof connectionSchema>;
export type ConnectionsResponse = z.infer<typeof connectionsResponseSchema>;
export type ConnectionActionResponse = z.infer<
  typeof connectionActionResponseSchema
>;
