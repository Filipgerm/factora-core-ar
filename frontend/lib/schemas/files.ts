import { z } from "zod";

export const fileUploadResponseSchema = z.object({
  document_id: z.string(),
  bucket: z.string(),
  path: z.string(),
  original_name: z.string(),
  content_type: z.string().nullable(),
  size: z.number(),
  public_url: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional().default({}),
});

export type FileUploadResponse = z.infer<typeof fileUploadResponseSchema>;
