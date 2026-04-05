"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createGlJournalEntry,
  fetchGlAccounts,
  fetchGlBillingBatches,
  fetchGlDimensions,
  fetchGlEntities,
  fetchGlJournalAudit,
  fetchGlJournalEntries,
  fetchGlJournalEntry,
  fetchGlPeriods,
  fetchGlRecurringTemplates,
  fetchGlRevenueSchedules,
  fetchGlTrialBalance,
  patchGlJournalEntry,
  patchGlPeriod,
  postGlJournalEntry,
  type GlJournalListParams,
} from "@/lib/api/general-ledger";
import { queryKeys } from "@/lib/api/query-keys";
import { apiErrorFromResponse } from "@/lib/api/error";
import { apiFetch } from "@/lib/api/client";
import { useAuthSession } from "@/lib/hooks/api/use-auth";
import type { GlAccountingPeriod, GlJournalEntryCreate } from "@/lib/schemas/general-ledger";
import { glAccountSchema } from "@/lib/schemas/general-ledger";

function useHasOrg() {
  const { data: session } = useAuthSession();
  return Boolean(session?.hasToken && session.profile?.organization_id);
}

export function useGlEntitiesQuery() {
  const hasOrg = useHasOrg();
  return useQuery({
    queryKey: queryKeys.generalLedger.entities(),
    queryFn: fetchGlEntities,
    enabled: hasOrg,
  });
}

export function useGlAccountsQuery() {
  const hasOrg = useHasOrg();
  return useQuery({
    queryKey: queryKeys.generalLedger.accounts(),
    queryFn: fetchGlAccounts,
    enabled: hasOrg,
  });
}

export function useGlPeriodsQuery() {
  const hasOrg = useHasOrg();
  return useQuery({
    queryKey: queryKeys.generalLedger.periods(),
    queryFn: fetchGlPeriods,
    enabled: hasOrg,
  });
}

export function useGlDimensionsQuery() {
  const hasOrg = useHasOrg();
  return useQuery({
    queryKey: queryKeys.generalLedger.dimensions(),
    queryFn: fetchGlDimensions,
    enabled: hasOrg,
  });
}

export function useGlJournalEntriesQuery(params: GlJournalListParams) {
  const hasOrg = useHasOrg();
  const key = {
    ...params,
    consolidated: Boolean(params.consolidated),
  };
  return useQuery({
    queryKey: queryKeys.generalLedger.journals(key),
    queryFn: () => fetchGlJournalEntries(params),
    enabled: hasOrg,
  });
}

export function useGlJournalEntryQuery(id: string | null) {
  const hasOrg = useHasOrg();
  return useQuery({
    queryKey: queryKeys.generalLedger.journal(id ?? ""),
    queryFn: () => fetchGlJournalEntry(id!),
    enabled: hasOrg && Boolean(id),
  });
}

export function useGlJournalAuditQuery(id: string | null) {
  const hasOrg = useHasOrg();
  return useQuery({
    queryKey: queryKeys.generalLedger.journalAudit(id ?? ""),
    queryFn: () => fetchGlJournalAudit(id!),
    enabled: hasOrg && Boolean(id),
  });
}

export function useGlBillingBatchesQuery() {
  const hasOrg = useHasOrg();
  return useQuery({
    queryKey: queryKeys.generalLedger.billingBatches(),
    queryFn: fetchGlBillingBatches,
    enabled: hasOrg,
  });
}

export function useGlRevenueSchedulesQuery(p: {
  legal_entity_id?: string | null;
  consolidated?: boolean;
}) {
  const hasOrg = useHasOrg();
  const key = { ...p, consolidated: Boolean(p.consolidated) };
  return useQuery({
    queryKey: queryKeys.generalLedger.revenueSchedules(key),
    queryFn: () => fetchGlRevenueSchedules(p),
    enabled: hasOrg,
  });
}

export function useGlTrialBalanceQuery(p: {
  legal_entity_id?: string | null;
  consolidated?: boolean;
  posting_period_id?: string | null;
}) {
  const hasOrg = useHasOrg();
  const key = { ...p, consolidated: Boolean(p.consolidated) };
  return useQuery({
    queryKey: queryKeys.generalLedger.trialBalance(key),
    queryFn: () => fetchGlTrialBalance(p),
    enabled: hasOrg,
  });
}

export function useGlRecurringTemplatesQuery(p: {
  legal_entity_id?: string | null;
  consolidated?: boolean;
}) {
  const hasOrg = useHasOrg();
  const key = { ...p, consolidated: Boolean(p.consolidated) };
  return useQuery({
    queryKey: queryKeys.generalLedger.recurringTemplates(key),
    queryFn: () => fetchGlRecurringTemplates(p),
    enabled: hasOrg,
  });
}

export function usePatchGlPeriodMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      periodId,
      status,
    }: {
      periodId: string;
      status: GlAccountingPeriod["status"];
    }) => patchGlPeriod(periodId, { status }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.generalLedger.periods() });
    },
  });
}

export function useCreateGlJournalMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: GlJournalEntryCreate) => createGlJournalEntry(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.generalLedger.all });
    },
  });
}

export function usePatchGlJournalMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Record<string, unknown>;
    }) => patchGlJournalEntry(id, body),
    onSuccess: (_data, v) => {
      void qc.invalidateQueries({ queryKey: queryKeys.generalLedger.all });
      void qc.invalidateQueries({
        queryKey: queryKeys.generalLedger.journal(v.id),
      });
    },
  });
}

export function usePostGlJournalMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postGlJournalEntry(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.generalLedger.all });
    },
  });
}

export function useCreateGlAccountMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await apiFetch(`/v1/general-ledger/accounts`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await apiErrorFromResponse(res);
      return glAccountSchema.parse(await res.json());
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.generalLedger.accounts() });
    },
  });
}

export function usePatchGlAccountMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: Record<string, unknown>;
    }) => {
      const res = await apiFetch(`/v1/general-ledger/accounts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await apiErrorFromResponse(res);
      return glAccountSchema.parse(await res.json());
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.generalLedger.accounts() });
    },
  });
}
