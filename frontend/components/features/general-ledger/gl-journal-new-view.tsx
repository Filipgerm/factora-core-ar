"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { fetchGlFxQuote } from "@/lib/api/general-ledger";
import { queryKeys } from "@/lib/api/query-keys";
import {
  useCreateGlJournalMutation,
  useGlAccountsQuery,
  useGlPeriodsQuery,
} from "@/lib/hooks/api/use-general-ledger";
import { useLedgerView } from "@/components/features/general-ledger/ledger-view-context";
import {
  glJournalEntryCreateSchema,
  type GlJournalEntryCreate,
} from "@/lib/schemas/general-ledger";

export function GlJournalNewView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.toString();
  const suffix = q ? `?${q}` : "";
  const { effectiveEntityId, consolidated } = useLedgerView();
  const createMut = useCreateGlJournalMutation();
  const { data: accounts = [] } = useGlAccountsQuery();
  const { data: periods = [] } = useGlPeriodsQuery();

  const selectable = accounts.filter((a) => !a.is_control_account && a.is_active);
  const todayIso = new Date().toISOString().slice(0, 10);

  const form = useForm<GlJournalEntryCreate>({
    resolver: zodResolver(glJournalEntryCreateSchema),
    defaultValues: {
      legal_entity_id: effectiveEntityId ?? "",
      posting_period_id: periods[0]?.id ?? null,
      entry_date: todayIso,
      document_currency: "EUR",
      base_currency: "EUR",
      fx_rate_to_base: undefined,
      memo: "",
      reference: "",
      lines: [
        {
          account_id: selectable[0]?.id ?? "",
          description: "",
          debit: 0,
          credit: 0,
          line_order: 0,
          dimension_value_ids: [],
        },
        {
          account_id: selectable[1]?.id ?? selectable[0]?.id ?? "",
          description: "",
          debit: 0,
          credit: 0,
          line_order: 1,
          dimension_value_ids: [],
        },
      ],
    },
  });

  const docCcy = form.watch("document_currency");
  const baseCcy = form.watch("base_currency");

  const { data: fx } = useQuery({
    queryKey: [...queryKeys.generalLedger.all, "fx", docCcy, baseCcy],
    queryFn: () => fetchGlFxQuote(docCcy, baseCcy),
    enabled: Boolean(docCcy && baseCcy),
  });

  useEffect(() => {
    if (fx?.rate != null) {
      form.setValue("fx_rate_to_base", fx.rate);
    }
  }, [fx, form]);

  useEffect(() => {
    if (effectiveEntityId && !consolidated) {
      form.setValue("legal_entity_id", effectiveEntityId);
    }
  }, [effectiveEntityId, consolidated, form]);

  useEffect(() => {
    const first = periods[0]?.id;
    if (first && form.getValues("posting_period_id") == null) {
      form.setValue("posting_period_id", first);
    }
  }, [periods, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const lines = form.watch("lines");
  const td = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const tc = lines.reduce((s, l) => s + (l.credit || 0), 0);
  const balanced = td === tc && td > 0;

  async function onSubmit(values: GlJournalEntryCreate) {
    await createMut.mutateAsync(values);
    router.push(`/general-ledger/journal-entries${suffix}`);
  }

  if (!effectiveEntityId && !consolidated) {
    return (
      <p className="text-sm text-muted-foreground">
        Select a legal entity in the header to create a journal.
      </p>
    );
  }
  if (consolidated) {
    return (
      <p className="text-sm text-muted-foreground">
        Turn off consolidated view to post to a specific entity.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight">New journal entry</h2>
        <Button variant="outline" asChild className="transition-all duration-200">
          <Link href={`/general-ledger/journal-entries${suffix}`}>Cancel</Link>
        </Button>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="posting_period_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Posting period</FormLabel>
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={(v) =>
                      field.onChange(v === "none" ? null : v)
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {periods.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="entry_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Entry date (economic event)</FormLabel>
                  <FormControl>
                    <Input className="h-9" type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="memo"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Memo</FormLabel>
                <FormControl>
                  <Input className="h-9" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="document_currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Document CCY</FormLabel>
                  <FormControl>
                    <Input className="h-9 uppercase" maxLength={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="base_currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Base CCY</FormLabel>
                  <FormControl>
                    <Input className="h-9 uppercase" maxLength={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
              <FormLabel className="text-xs">Spot rate (read-only)</FormLabel>
              <Input
                className="h-9 bg-slate-50 tabular-nums"
                readOnly
                value={fx?.rate != null ? String(fx.rate) : "—"}
              />
            </FormItem>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-100 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Lines</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-[10px] transition-all duration-200"
                onClick={() =>
                  append({
                    account_id: selectable[0]?.id ?? "",
                    description: "",
                    debit: 0,
                    credit: 0,
                    line_order: fields.length,
                    dimension_value_ids: [],
                  })
                }
              >
                <Plus className="size-3" aria-hidden />
                Add line
              </Button>
            </div>
            {fields.map((f, idx) => (
              <div
                key={f.id}
                className="grid grid-cols-12 gap-2 border-b border-slate-50 py-2 last:border-0"
              >
                <div className="col-span-5">
                  <FormField
                    control={form.control}
                    name={`lines.${idx}.account_id`}
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder="Account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {selectable.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.code} — {a.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name={`lines.${idx}.debit`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            className="h-9 text-xs tabular-nums"
                            {...field}
                            onChange={(e) => {
                              const n = parseFloat(e.target.value) || 0;
                              field.onChange(n);
                              form.setValue(`lines.${idx}.credit`, 0);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name={`lines.${idx}.credit`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            className="h-9 text-xs tabular-nums"
                            {...field}
                            onChange={(e) => {
                              const n = parseFloat(e.target.value) || 0;
                              field.onChange(n);
                              form.setValue(`lines.${idx}.debit`, 0);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-1 flex items-start justify-end pt-1">
                  {fields.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-red-600 transition-all duration-200"
                      onClick={() => remove(idx)}
                      aria-label="Remove line"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div
            className={`text-sm tabular-nums ${balanced ? "text-slate-700" : "text-red-600"}`}
          >
            Debits {td.toFixed(2)} · Credits {tc.toFixed(2)}
            {!balanced && " — must match and be non-zero"}
          </div>

          <Button
            type="submit"
            disabled={!balanced || createMut.isPending}
            className="transition-all duration-200"
          >
            Save draft
          </Button>
        </form>
      </Form>
    </div>
  );
}
