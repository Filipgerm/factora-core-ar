import { z } from "zod";

/** Normalized GEMI search item from backend `GemiService._normalize_results` */
export const gemiSearchItemSchema = z
  .object({
    company_name: z.string(),
    afm: z.string(),
    ar_gemi: z.string(),
    legal_type: z.string().optional(),
    zip_code: z.string().optional(),
    municipality: z.string().optional(),
    city: z.string().optional(),
    street: z.string().optional(),
    street_number: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    objective: z.string().optional(),
    status: z.string().optional(),
    gemi_office: z.string().optional(),
  })
  .passthrough();

export const gemiSearchResponseSchema = z.object({
  items: z.array(gemiSearchItemSchema),
  query: z.string(),
  mode: z.enum(["afm", "gemi_number"]),
  exact: z.boolean(),
});

export const gemiFetchDocumentsResponseSchema = z.object({
  company: z.string(),
  documents_uploaded: z.number(),
  message: z.string(),
});

export type GemiSearchItem = z.infer<typeof gemiSearchItemSchema>;
export type GemiSearchResponse = z.infer<typeof gemiSearchResponseSchema>;
export type GemiFetchDocumentsResponse = z.infer<
  typeof gemiFetchDocumentsResponseSchema
>;
