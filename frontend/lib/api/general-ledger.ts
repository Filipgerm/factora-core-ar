import { apiFetch } from "@/lib/api/client";
import { apiErrorFromResponse } from "@/lib/api/error";
import type {
  GlAccount,
  GlAccountingPeriod,
  GlAuditEvent,
  GlBillingBatch,
  GlDimension,
  GlFxQuote,
  GlJournalEntry,
  GlJournalEntryCreate,
  GlLegalEntity,
  GlRecurringTemplate,
  GlRevenueSchedule,
  GlTrialBalanceRow,
} from "@/lib/schemas/general-ledger";
import {
  glAccountSchema,
  glAccountingPeriodSchema,
  glAuditEventSchema,
  glBillingBatchSchema,
  glDimensionSchema,
  glFxQuoteSchema,
  glJournalEntrySchema,
  glLegalEntitySchema,
  glRecurringTemplateSchema,
  glRevenueScheduleSchema,
  glTrialBalanceRowSchema,
} from "@/lib/schemas/general-ledger";
import { z } from "zod";

export type GlJournalListParams = {
  legal_entity_id?: string | null;
  consolidated?: boolean;
  account_id?: string | null;
  status?: string | null;
  posting_period_id?: string | null;
  source_batch_id?: string | null;
};

function sp(params: Record<string, string | boolean | undefined | null>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    u.set(k, String(v));
  }
  const q = u.toString();
  return q ? `?${q}` : "";
}

export async function fetchGlEntities(): Promise<GlLegalEntity[]> {
  const res = await apiFetch(`/v1/general-ledger/entities`);
  if (!res.ok) throw await apiErrorFromResponse(res);
  return z.array(glLegalEntitySchema).parse(await res.json());
}

export async function fetchGlAccounts(): Promise<GlAccount[]> {
  const res = await apiFetch(`/v1/general-ledger/accounts`);
  if (!res.ok) throw await apiErrorFromResponse(res);
  return z.array(glAccountSchema).parse(await res.json());
}

export async function fetchGlPeriods(): Promise<GlAccountingPeriod[]> {
  const res = await apiFetch(`/v1/general-ledger/periods`);
  if (!res.ok) throw await apiErrorFromResponse(res);
  return z.array(glAccountingPeriodSchema).parse(await res.json());
}

export async function patchGlPeriod(
  periodId: string,
  body: { status: GlAccountingPeriod["status"] }
): Promise<GlAccountingPeriod> {
  const res = await apiFetch(`/v1/general-ledger/periods/${periodId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await apiErrorFromResponse(res);
  return glAccountingPeriodSchema.parse(await res.json());
}

export async function fetchGlDimensions(): Promise<GlDimension[]> {
  const res = await apiFetch(`/v1/general-ledger/dimensions`);
  if (!res.ok) throw await apiErrorFromResponse(res);
  return z.array(glDimensionSchema).parse(await res.json());
}

export async function fetchGlJournalEntries(
  p: GlJournalListParams
): Promise<GlJournalEntry[]> {
  const q = sp({
    legal_entity_id: p.legal_entity_id ?? undefined,
    consolidated: p.consolidated ? "true" : undefined,
    account_id: p.account_id ?? undefined,
    status: p.status ?? undefined,
    posting_period_id: p.posting_period_id ?? undefined,
    source_batch_id: p.source_batch_id ?? undefined,
  });
  const res = await apiFetch(`/v1/general-ledger/journal-entries${q}`);
  if (!res.ok) throw await apiErrorFromResponse(res);
  return z.array(glJournalEntrySchema).parse(await res.json());
}

export async function fetchGlJournalEntry(id: string): Promise<GlJournalEntry> {
  const res = await apiFetch(`/v1/general-ledger/journal-entries/${id}`);
  if (!res.ok) throw await apiErrorFromResponse(res);
  return glJournalEntrySchema.parse(await res.json());
}

export async function createGlJournalEntry(
  body: GlJournalEntryCreate
): Promise<GlJournalEntry> {
  const res = await apiFetch(`/v1/general-ledger/journal-entries`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await apiErrorFromResponse(res);
  return glJournalEntrySchema.parse(await res.json());
}

export async function patchGlJournalEntry(
  id: string,
  body: Record<string, unknown>
): Promise<GlJournalEntry> {
  const res = await apiFetch(`/v1/general-ledger/journal-entries/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await apiErrorFromResponse(res);
  return glJournalEntrySchema.parse(await res.json());
}

export async function postGlJournalEntry(id: string): Promise<GlJournalEntry> {
  const res = await apiFetch(`/v1/general-ledger/journal-entries/${id}/post`, {
    method: "POST",
  });
  if (!res.ok) throw await apiErrorFromResponse(res);
  return glJournalEntrySchema.parse(await res.json());
}

export type GlJournalReverseBody = {
  entry_date?: string;
  memo?: string;
  reference?: string;
};

export async function reverseGlJournalEntry(
  id: string,
  body?: GlJournalReverseBody | null
): Promise<GlJournalEntry> {
  const res = await apiFetch(`/v1/general-ledger/journal-entries/${id}/reverse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw await apiErrorFromResponse(res);
  return glJournalEntrySchema.parse(await res.json());
}

export async function fetchGlJournalAudit(
  id: string
): Promise<GlAuditEvent[]> {
  const res = await apiFetch(`/v1/general-ledger/journal-entries/${id}/audit`);
  if (!res.ok) throw await apiErrorFromResponse(res);
  return z.array(glAuditEventSchema).parse(await res.json());
}

export async function fetchGlBillingBatches(): Promise<GlBillingBatch[]> {
  const res = await apiFetch(`/v1/general-ledger/billing-batches`);
  if (!res.ok) throw await apiErrorFromResponse(res);
  return z.array(glBillingBatchSchema).parse(await res.json());
}

export async function fetchGlRevenueSchedules(p: {
  legal_entity_id?: string | null;
  consolidated?: boolean;
}): Promise<GlRevenueSchedule[]> {
  const q = sp({
    legal_entity_id: p.legal_entity_id ?? undefined,
    consolidated: p.consolidated ? "true" : undefined,
  });
  const res = await apiFetch(`/v1/general-ledger/revenue-schedules${q}`);
  if (!res.ok) throw await apiErrorFromResponse(res);
  return z.array(glRevenueScheduleSchema).parse(await res.json());
}

export async function fetchGlTrialBalance(p: {
  legal_entity_id?: string | null;
  consolidated?: boolean;
  posting_period_id?: string | null;
}): Promise<GlTrialBalanceRow[]> {
  const q = sp({
    legal_entity_id: p.legal_entity_id ?? undefined,
    consolidated: p.consolidated ? "true" : undefined,
    posting_period_id: p.posting_period_id ?? undefined,
  });
  const res = await apiFetch(`/v1/general-ledger/trial-balance${q}`);
  if (!res.ok) throw await apiErrorFromResponse(res);
  return z.array(glTrialBalanceRowSchema).parse(await res.json());
}

export async function fetchGlFxQuote(
  fromCurrency: string,
  toCurrency: string
): Promise<GlFxQuote> {
  const q = sp({ from_currency: fromCurrency, to_currency: toCurrency });
  const res = await apiFetch(`/v1/general-ledger/fx-quote${q}`);
  if (!res.ok) throw await apiErrorFromResponse(res);
  return glFxQuoteSchema.parse(await res.json());
}

export async function fetchGlRecurringTemplates(p: {
  legal_entity_id?: string | null;
  consolidated?: boolean;
}): Promise<GlRecurringTemplate[]> {
  const q = sp({
    legal_entity_id: p.legal_entity_id ?? undefined,
    consolidated: p.consolidated ? "true" : undefined,
  });
  const res = await apiFetch(`/v1/general-ledger/recurring-templates${q}`);
  if (!res.ok) throw await apiErrorFromResponse(res);
  return z.array(glRecurringTemplateSchema).parse(await res.json());
}
