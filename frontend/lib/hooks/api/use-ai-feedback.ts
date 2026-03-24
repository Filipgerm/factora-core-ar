"use client";

import { useMutation } from "@tanstack/react-query";

import { submitAiFeedback } from "@/lib/api/ai";
import type { AiFeedbackRequest } from "@/lib/schemas/ai";

export function useSubmitAiFeedbackMutation() {
  return useMutation({
    mutationFn: (body: AiFeedbackRequest) => submitAiFeedback(body),
  });
}
