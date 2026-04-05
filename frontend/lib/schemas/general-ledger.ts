import { z } from "zod";

/** API returns decimals as JSON numbers; tolerate strings from edge encodings. */
const money = z.union([z.number(), z.string()]).transform((v) => {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
});

export const glLegalEntitySchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  functional_currency: z.string(),
  is_primary: z.boolean(),
});
export type GlLegalEntity = z.infer<typeof glLegalEntitySchema>;

export const glAccountSchema = z.object({
  id: z.string().uuid(),
  parent_account_id: z.string().uuid().nullable(),
  code: z.string(),
  name: z.string(),
  account_type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
  normal_balance: z.enum(["debit", "credit"]),
  subledger_kind: z.enum(["none", "ar", "ap"]),
  is_active: z.boolean(),
  is_control_account: z.boolean(),
  sort_order: z.number(),
});
export type GlAccount = z.infer<typeof glAccountSchema>;

export const glAccountingPeriodSchema = z.object({
  id: z.string().uuid(),
  period_start: z.string(),
  period_end: z.string(),
  label: z.string(),
  status: z.enum(["open", "soft_close", "hard_close"]),
});
export type GlAccountingPeriod = z.infer<typeof glAccountingPeriodSchema>;

export const glDimensionValueSchema = z.object({
  id: z.string().uuid(),
  dimension_id: z.string().uuid(),
  code: z.string(),
  label: z.string(),
});
export type GlDimensionValue = z.infer<typeof glDimensionValueSchema>;

export const glDimensionSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  label: z.string(),
  values: z.array(glDimensionValueSchema),
});
export type GlDimension = z.infer<typeof glDimensionSchema>;

export const glJournalLineSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  description: z.string().nullable(),
  debit: money,
  credit: money,
  line_order: z.number(),
  dimension_value_ids: z.array(z.string().uuid()),
});
export type GlJournalLine = z.infer<typeof glJournalLineSchema>;

export const glJournalEntrySchema = z.object({
  id: z.string().uuid(),
  legal_entity_id: z.string().uuid(),
  posting_period_id: z.string().uuid().nullable(),
  status: z.enum(["draft", "posted"]),
  document_currency: z.string(),
  base_currency: z.string(),
  fx_rate_to_base: money.nullable(),
  memo: z.string().nullable(),
  reference: z.string().nullable(),
  source_batch_id: z.string().nullable(),
  posted_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  lines: z.array(glJournalLineSchema),
  total_debit: money,
  total_credit: money,
});
export type GlJournalEntry = z.infer<typeof glJournalEntrySchema>;

export const glBillingBatchSchema = z.object({
  id: z.string().uuid(),
  legal_entity_id: z.string().uuid().nullable(),
  external_batch_id: z.string(),
  source_system: z.string(),
  event_count: z.number(),
  total_amount: money,
  currency: z.string(),
  received_at: z.string(),
});
export type GlBillingBatch = z.infer<typeof glBillingBatchSchema>;

export const glRevenueWaterfallPointSchema = z.object({
  period_month: z.string(),
  deferred_opening: money,
  recognized_in_period: money,
  deferred_closing: money,
});
export type GlRevenueWaterfallPoint = z.infer<
  typeof glRevenueWaterfallPointSchema
>;

export const glRevenueScheduleSchema = z.object({
  id: z.string().uuid(),
  legal_entity_id: z.string().uuid(),
  contract_name: z.string(),
  currency: z.string(),
  total_contract_value: money,
  lines: z.array(glRevenueWaterfallPointSchema),
});
export type GlRevenueSchedule = z.infer<typeof glRevenueScheduleSchema>;

export const glRecurringTemplateLineSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  description: z.string().nullable(),
  debit: money,
  credit: money,
  line_order: z.number(),
});
export type GlRecurringTemplateLine = z.infer<
  typeof glRecurringTemplateLineSchema
>;

export const glRecurringTemplateSchema = z.object({
  id: z.string().uuid(),
  legal_entity_id: z.string().uuid(),
  name: z.string(),
  memo: z.string().nullable(),
  frequency: z.enum(["monthly", "quarterly"]),
  day_of_month: z.number(),
  is_active: z.boolean(),
  template_lines: z.array(glRecurringTemplateLineSchema),
});
export type GlRecurringTemplate = z.infer<typeof glRecurringTemplateSchema>;

export const glTrialBalanceRowSchema = z.object({
  account_id: z.string().uuid(),
  account_code: z.string(),
  account_name: z.string(),
  debit_total: money,
  credit_total: money,
});
export type GlTrialBalanceRow = z.infer<typeof glTrialBalanceRowSchema>;

export const glFxQuoteSchema = z.object({
  from_currency: z.string(),
  to_currency: z.string(),
  rate: money,
});
export type GlFxQuote = z.infer<typeof glFxQuoteSchema>;

export const glAuditEventSchema = z.object({
  id: z.string().uuid(),
  subject_type: z.string(),
  subject_id: z.string(),
  action: z.string(),
  actor_user_id: z.string().uuid().nullable(),
  payload: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string(),
});
export type GlAuditEvent = z.infer<typeof glAuditEventSchema>;

export const glJournalLineInputSchema = z.object({
  account_id: z.string().uuid(),
  description: z.string().optional(),
  debit: z.number().min(0),
  credit: z.number().min(0),
  line_order: z.number().int(),
  dimension_value_ids: z.array(z.string().uuid()).default([]),
});
export type GlJournalLineInput = z.infer<typeof glJournalLineInputSchema>;

export const glJournalEntryCreateSchema = z.object({
  legal_entity_id: z.string().uuid(),
  posting_period_id: z.string().uuid().nullable().optional(),
  document_currency: z.string().length(3),
  base_currency: z.string().length(3).default("EUR"),
  fx_rate_to_base: z.number().positive().optional().nullable(),
  memo: z.string().optional(),
  reference: z.string().optional(),
  lines: z.array(glJournalLineInputSchema).min(2),
});
export type GlJournalEntryCreate = z.infer<typeof glJournalEntryCreateSchema>;
