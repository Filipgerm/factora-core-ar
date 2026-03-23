"use client";

import { useMutation } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import { apiErrorFromResponse } from "@/lib/api/error";
import {
  fileUploadResponseSchema,
  type FileUploadResponse,
} from "@/lib/schemas/files";

async function parseJson<T>(
  res: Response,
  schema: { parse: (data: unknown) => T }
): Promise<T> {
  const json = await res.json();
  return schema.parse(json);
}

export function useUploadBillMutation() {
  return useMutation({
    mutationFn: async (file: File): Promise<FileUploadResponse> => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("purpose", "ap_bill");
      const res = await apiFetch("/v1/files/upload", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw await apiErrorFromResponse(res);
      return parseJson(res, fileUploadResponseSchema);
    },
  });
}
