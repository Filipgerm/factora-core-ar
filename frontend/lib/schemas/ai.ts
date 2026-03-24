import { z } from "zod";

export const aiFeedbackRequestSchema = z.object({
  content_text: z.string().min(1).max(16000),
  suggested_label: z.string().min(1).max(256),
  corrected_label: z.string().min(1).max(256),
  source: z.string().max(64).optional().default("ui"),
});

export const aiFeedbackResponseSchema = z.object({
  embedding_id: z.string().uuid(),
  message: z.string().optional(),
});

export type AiFeedbackRequest = z.infer<typeof aiFeedbackRequestSchema>;
export type AiFeedbackResponse = z.infer<typeof aiFeedbackResponseSchema>;
