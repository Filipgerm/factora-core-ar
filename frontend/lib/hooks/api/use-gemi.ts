"use client";

import { useMutation } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import { apiErrorFromResponse } from "@/lib/api/error";
import {
  gemiSearchResponseSchema,
  type GemiSearchResponse,
} from "@/lib/schemas/gemi";

async function parseJson<T>(
  res: Response,
  schema: { parse: (data: unknown) => T }
): Promise<T> {
  const json = await res.json();
  return schema.parse(json);
}

/** Explicit GEMI search (e.g. VAT lookup button) — avoids ``useQuery`` enable rules. */
export function useGemiSearchByAfmMutation() {
  return useMutation({
    mutationFn: async (afmRaw: string): Promise<GemiSearchResponse> => {
      const q = afmRaw.replace(/\D/g, "");
      if (q.length < 3) {
        throw new Error("Enter at least 3 digits of the VAT / AFM number.");
      }
      const sp = new URLSearchParams({ q, mode: "afm", limit: "10" });
      const res = await apiFetch(`/v1/companies/gemi/search?${sp.toString()}`);
      if (!res.ok) throw await apiErrorFromResponse(res);
      return parseJson(res, gemiSearchResponseSchema);
    },
  });
}
