"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { apiErrorFromResponse } from "@/lib/api/error";
import { requestedDocsResponseSchema } from "@/lib/schemas/aade/mydata";
import { useAuthSession } from "@/lib/hooks/api/use-auth";

async function parseJson<T>(
  res: Response,
  schema: { parse: (data: unknown) => T }
): Promise<T> {
  const json = await res.json();
  return schema.parse(json);
}

export type MydataDocsParams = {
  mark: number;
  entityVatNumber?: string;
  dateFrom?: string;
  dateTo?: string;
  receiverVatNumber?: string;
  invType?: string;
  transmitted?: boolean;
  save?: boolean;
};

/**
 * Fetches myDATA documents. `mark` is required by the upstream API contract.
 */
export function useMydataDocsQuery(params: MydataDocsParams | null) {
  const { data: session } = useAuthSession();
  const hasOrg = Boolean(session?.hasToken && session.profile?.organization_id);
  const enabled = Boolean(hasOrg && params && Number.isFinite(params.mark));

  return useQuery({
    queryKey: queryKeys.mydata.docs({
      mark: params ? String(params.mark) : "",
      t: params?.transmitted ? "1" : "0",
      s: params?.save ? "1" : "0",
    }),
    queryFn: async () => {
      if (!params) throw new Error("params required");
      const sp = new URLSearchParams();
      sp.set("mark", String(params.mark));
      if (params.entityVatNumber) sp.set("entityVatNumber", params.entityVatNumber);
      if (params.dateFrom) sp.set("dateFrom", params.dateFrom);
      if (params.dateTo) sp.set("dateTo", params.dateTo);
      if (params.receiverVatNumber)
        sp.set("receiverVatNumber", params.receiverVatNumber);
      if (params.invType) sp.set("invType", params.invType);
      if (params.transmitted) sp.set("transmitted", "true");
      if (params.save) sp.set("save", "true");
      const res = await apiFetch(`/v1/aade/mydata/docs?${sp.toString()}`);
      if (!res.ok) throw await apiErrorFromResponse(res);
      return parseJson(res, requestedDocsResponseSchema);
    },
    enabled,
  });
}
