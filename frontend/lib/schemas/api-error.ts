import { z } from "zod";

/**
 * Normalized JSON body from FastAPI `AppError` handler:
 * `{ detail, code, fields? }` → `fields` always a string map (empty when omitted).
 */
export const appErrorBodySchema = z
  .object({
    detail: z.string(),
    code: z.string(),
    fields: z.record(z.string()).optional(),
  })
  .transform((o) => ({
    detail: o.detail,
    code: o.code,
    fields: o.fields ?? ({} as Record<string, string>),
  }));

export type AppErrorBody = z.infer<typeof appErrorBodySchema>;
