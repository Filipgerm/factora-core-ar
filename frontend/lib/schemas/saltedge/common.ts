import { z } from "zod";

export const metaObjectSchema = z.object({
  next_id: z.string().nullable().optional(),
  next_page: z.string().nullable().optional(),
});

export type MetaObject = z.infer<typeof metaObjectSchema>;
