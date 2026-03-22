"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { apiErrorFromResponse } from "@/lib/api/types";
import {
  gemiFetchDocumentsResponseSchema,
  gemiSearchResponseSchema,
  type GemiFetchDocumentsResponse,
  type GemiSearchResponse,
} from "@/lib/schemas/gemi";

async function parseJson<T>(
  res: Response,
  schema: { parse: (data: unknown) => T }
): Promise<T> {
  const json = await res.json();
  return schema.parse(json);
}

export function useGemiSearchQuery(
  q: string,
  mode: "afm" | "gemi_number" = "afm"
) {
  const enabled = q.replace(/\D/g, "").length >= 3;

  return useQuery({
    queryKey: queryKeys.gemi.search(q, mode),
    queryFn: async (): Promise<GemiSearchResponse> => {
      const sp = new URLSearchParams({ q, mode, limit: "10" });
      const res = await apiFetch(`/v1/companies/gemi/search?${sp.toString()}`);
      if (!res.ok) throw await apiErrorFromResponse(res);
      return parseJson(res, gemiSearchResponseSchema);
    },
    enabled,
  });
}

export function useGemiFetchDocumentsMutation() {
  return useMutation({
    mutationFn: async (afm: string): Promise<GemiFetchDocumentsResponse> => {
      const path = `/v1/companies/gemi/${encodeURIComponent(afm)}/documents:fetch`;
      const res = await apiFetch(path, { method: "POST" });
      if (!res.ok) throw await apiErrorFromResponse(res);
      return parseJson(res, gemiFetchDocumentsResponseSchema);
    },
  });
}
