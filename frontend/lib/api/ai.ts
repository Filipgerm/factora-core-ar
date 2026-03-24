import { apiFetchJson } from "@/lib/api/client";
import {
  aiFeedbackRequestSchema,
  aiFeedbackResponseSchema,
  type AiFeedbackRequest,
  type AiFeedbackResponse,
} from "@/lib/schemas/ai";

export async function submitAiFeedback(
  body: AiFeedbackRequest
): Promise<AiFeedbackResponse> {
  const parsed = aiFeedbackRequestSchema.parse(body);
  const raw: unknown = await apiFetchJson<unknown>("/v1/ai/feedback", {
    method: "POST",
    body: JSON.stringify(parsed),
  });
  return aiFeedbackResponseSchema.parse(raw);
}
