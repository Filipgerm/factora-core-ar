"use client";

import { useMemo, useState } from "react";
import { addDays, format, isValid, parseISO } from "date-fns";
import { ArrowRight, Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export type DraftLineItem = {
  id: string;
  description: string;
  product: string;
  qty: number;
  unitPrice: number;
  vatPct: number;
};

function fmtEUR(n: number) {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function lineNet(qty: number, unit: number) {
  return Math.round(qty * unit * 100) / 100;
}

function lineGross(net: number, vatPct: number) {
  return Math.round(net * (1 + vatPct / 100) * 100) / 100;
}

const DEFAULT_LINES: DraftLineItem[] = [
  {
    id: "L1",
    description: "Annual SaaS subscription — Enterprise plan",
    product: "7000 Revenue",
    qty: 1,
    unitPrice: 9600,
    vatPct: 24,
  },
  {
    id: "L2",
    description: "Onboarding — professional services",
    product: "7100 Services",
    qty: 8,
    unitPrice: 150,
    vatPct: 24,
  },
];

function nextLineId() {
  return `L-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now()}`;
}

type ArCreateInvoiceSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ArCreateInvoiceSheet({
  open,
  onOpenChange,
}: ArCreateInvoiceSheetProps) {
  const { toast } = useToast();
  const [series, setSeries] = useState("typy");
  const [issueDate, setIssueDate] = useState("2025-03-21");
  const [customer, setCustomer] = useState("Acme Software IKE");
  const [customerVatOk, setCustomerVatOk] = useState(true);
  const [paymentTermsDays, setPaymentTermsDays] = useState(30);
  const [mydataType, setMydataType] = useState("2.1");
  const [currency, setCurrency] = useState("EUR");
  const [lines, setLines] = useState<DraftLineItem[]>(() => [...DEFAULT_LINES]);

  const issueParsed = useMemo(() => {
    const d = parseISO(issueDate);
    return isValid(d) ? d : new Date();
  }, [issueDate]);

  const dueDate = addDays(issueParsed, paymentTermsDays);
  const paymentTermsLabel = `Net ${paymentTermsDays} — due ${format(dueDate, "d MMMM yyyy")}`;

  const totals = useMemo(() => {
    let net = 0;
    let vat = 0;
    for (const ln of lines) {
      const n = lineNet(ln.qty, ln.unitPrice);
      const g = lineGross(n, ln.vatPct);
      net += n;
      vat += g - n;
    }
    net = Math.round(net * 100) / 100;
    vat = Math.round(vat * 100) / 100;
    const gross = Math.round((net + vat) * 100) / 100;

    const annualLine = lines.find((l) =>
      /annual|subscription|saas/i.test(l.description)
    );
    let deferred = 0;
    let showDeferBanner = false;
    if (annualLine) {
      const n = lineNet(annualLine.qty, annualLine.unitPrice);
      deferred = Math.round((n * 11) / 12 * 100) / 100;
      showDeferBanner = n > 0;
    }

    return { net, vat, gross, deferred, showDeferBanner, annualNet: annualLine ? lineNet(annualLine.qty, annualLine.unitPrice) : 0 };
  }, [lines]);

  const monthlyRecognized =
    totals.annualNet > 0 ? Math.round((totals.annualNet / 12) * 100) / 100 : 0;

  const updateLine = (id: string, patch: Partial<DraftLineItem>) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
    );
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: nextLineId(),
        description: "",
        product: "7000 Revenue",
        qty: 1,
        unitPrice: 0,
        vatPct: 24,
      },
    ]);
  };

  const seriesLabel =
    series === "typy"
      ? "ΤΠΥ — Τιμολόγιο Παροχής Υπηρεσιών"
      : "ΤΠ — Τιμολόγιο Πώλησης";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full max-w-[min(100vw,1180px)] flex-col gap-0 border-slate-200 bg-background p-0 text-foreground sm:max-w-[1180px] dark:border-slate-800"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-slate-200 px-6 py-4 text-left dark:border-slate-800">
          <SheetTitle className="text-lg font-semibold tracking-tight text-foreground">
            New invoice
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            Draft — myDATA classification and deferred revenue are evaluated live.
          </p>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Editor */}
          <div className="min-h-0 w-full overflow-y-auto border-b border-slate-200 lg:w-1/2 lg:border-r lg:border-b-0 dark:border-slate-800">
            <div className="space-y-8 p-6">
              <section className="space-y-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Invoice details
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Series
                    </Label>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={series} onValueChange={setSeries}>
                        <SelectTrigger className="h-10 min-w-[240px] flex-1 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="typy">
                            ΤΠΥ — Τιμολόγιο Παροχής Υπηρεσιών
                          </SelectItem>
                          <SelectItem value="tp">ΤΠ — Τιμολόγιο Πώλησης</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-muted-foreground dark:border-slate-700 dark:bg-slate-900/40">
                        #0048 (next)
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Issue date
                    </Label>
                    <Input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="h-10 rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Payment terms (days)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={paymentTermsDays}
                      onChange={(e) =>
                        setPaymentTermsDays(Number(e.target.value) || 0)
                      }
                      className="h-10 rounded-lg"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Customer *
                    </Label>
                    <div className="relative">
                      <Input
                        value={customer}
                        onChange={(e) => setCustomer(e.target.value)}
                        className="h-10 rounded-lg pr-24"
                      />
                      <button
                        type="button"
                        onClick={() => setCustomerVatOk((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                      >
                        <Badge
                          className={cn(
                            "border-0 text-[10px] font-semibold",
                            customerVatOk
                              ? "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200"
                              : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                          )}
                        >
                          ΑΦΜ {customerVatOk ? "✓" : "?"}
                        </Badge>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Payment terms
                    </Label>
                    <Input
                      readOnly
                      value={paymentTermsLabel}
                      className="h-10 rounded-lg bg-muted/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      myDATA document type
                    </Label>
                    <Select value={mydataType} onValueChange={setMydataType}>
                      <SelectTrigger className="h-10 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2.1">
                          2.1 — Τιμολόγιο Παροχής Υπηρεσιών
                        </SelectItem>
                        <SelectItem value="1.1">
                          1.1 — Τιμολόγιο Πώλησης
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Currency
                    </Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="h-10 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR — Euro</SelectItem>
                        <SelectItem value="USD">USD — US Dollar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Line items
                  </h3>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                  <table className="w-full min-w-[640px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wide text-muted-foreground dark:border-slate-800 dark:bg-slate-900/40">
                        <th className="px-2 py-2 font-medium">Description</th>
                        <th className="px-2 py-2 font-medium">Product</th>
                        <th className="w-14 px-2 py-2 font-medium">Qty</th>
                        <th className="w-28 px-2 py-2 font-medium">
                          Unit price
                        </th>
                        <th className="w-14 px-2 py-2 font-medium">VAT</th>
                        <th className="w-24 px-2 py-2 font-medium">Net</th>
                        <th className="w-24 px-2 py-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((ln) => {
                        const n = lineNet(ln.qty, ln.unitPrice);
                        const g = lineGross(n, ln.vatPct);
                        return (
                          <tr
                            key={ln.id}
                            className="border-b border-slate-100 align-middle last:border-0 dark:border-slate-800/80"
                          >
                            <td className="p-2 align-middle">
                              <Input
                                value={ln.description}
                                onChange={(e) =>
                                  updateLine(ln.id, {
                                    description: e.target.value,
                                  })
                                }
                                className="h-8 min-w-[140px] text-xs"
                              />
                            </td>
                            <td className="p-2 align-middle">
                              <Input
                                value={ln.product}
                                onChange={(e) =>
                                  updateLine(ln.id, { product: e.target.value })
                                }
                                className="h-8 min-w-[100px] text-xs"
                              />
                            </td>
                            <td className="p-2 align-middle">
                              <Input
                                type="number"
                                min={0}
                                value={ln.qty}
                                onChange={(e) =>
                                  updateLine(ln.id, {
                                    qty: Number(e.target.value) || 0,
                                  })
                                }
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="p-2 align-middle">
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={ln.unitPrice}
                                onChange={(e) =>
                                  updateLine(ln.id, {
                                    unitPrice: Number(e.target.value) || 0,
                                  })
                                }
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="p-2 align-middle">
                              <Input
                                type="number"
                                min={0}
                                value={ln.vatPct}
                                onChange={(e) =>
                                  updateLine(ln.id, {
                                    vatPct: Number(e.target.value) || 0,
                                  })
                                }
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="p-2 align-middle font-mono tabular-nums text-muted-foreground">
                              {fmtEUR(n)}
                            </td>
                            <td className="p-2 align-middle font-mono tabular-nums text-foreground">
                              {fmtEUR(g)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={addLine}
                  className="text-xs font-medium text-[var(--brand-primary)] transition-colors hover:opacity-90"
                >
                  + Add line item
                </button>
              </section>

              <section className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                <div className="ml-auto w-full max-w-xs space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Net amount</span>
                    <span className="font-mono tabular-nums text-foreground">
                      {fmtEUR(totals.net)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>VAT (24%)</span>
                    <span className="font-mono tabular-nums text-foreground">
                      {fmtEUR(totals.vat)}
                    </span>
                  </div>
                  {totals.showDeferBanner ? (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Deferred revenue (11 months)</span>
                      <span className="font-mono tabular-nums">
                        −{fmtEUR(totals.deferred)}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-foreground dark:border-slate-800">
                    <span>Invoice total</span>
                    <span className="font-mono tabular-nums">
                      {fmtEUR(totals.gross)}
                    </span>
                  </div>
                </div>

                {totals.showDeferBanner ? (
                  <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-950 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100">
                    Annual subscription detected. {fmtEUR(totals.annualNet)} will
                    be recognized as {fmtEUR(monthlyRecognized)}/month over 12
                    months. {fmtEUR(totals.deferred)} deferred revenue will be
                    created on issue.
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-lg transition-all duration-200"
                    onClick={() =>
                      toast({
                        title: "Draft saved",
                        description: "Demo only — state stays in this session.",
                      })
                    }
                  >
                    Save draft
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-lg transition-all duration-200"
                    onClick={() =>
                      toast({
                        title: "Preview PDF",
                        description: "Would open print-ready PDF (demo).",
                      })
                    }
                  >
                    Preview PDF
                  </Button>
                  <Button
                    type="button"
                    className="rounded-lg bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/90"
                    onClick={() => {
                      toast({
                        title: "Invoice issued",
                        description: `${customer} — ${fmtEUR(totals.gross)} (demo).`,
                      });
                      onOpenChange(false);
                    }}
                  >
                    Issue invoice
                    <ArrowRight className="ml-1 size-4" aria-hidden />
                  </Button>
                </div>
              </section>
            </div>
          </div>

          {/* Live preview */}
          <div className="min-h-0 w-full overflow-y-auto bg-slate-50/80 p-6 dark:bg-slate-900/25 lg:w-1/2">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Live preview
            </p>
            <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 text-foreground shadow-md dark:border-slate-700 dark:bg-background">
              <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-700">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Factora
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Demo issuer · Athens</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">INVOICE</p>
                  <p className="mt-1 font-mono text-slate-600 dark:text-slate-400">#0048 (draft)</p>
                  <p className="text-slate-500">{seriesLabel}</p>
                </div>
              </div>
              <div className="mb-6 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-400">
                    Bill to
                  </p>
                  <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">{customer}</p>
                  {customerVatOk ? (
                    <p className="mt-0.5 flex items-center gap-1 text-emerald-600">
                      <Check className="size-3" aria-hidden />
                      VAT verified
                    </p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">
                    Dates
                  </p>
                  <p className="mt-1 text-slate-700 dark:text-slate-300">
                    Issued {format(issueParsed, "d MMM yyyy")}
                  </p>
                  <p className="text-slate-700 dark:text-slate-300">Due {format(dueDate, "d MMM yyyy")}</p>
                  <p className="mt-1 text-slate-500">{currency}</p>
                </div>
              </div>
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-400 dark:border-slate-700">
                    <th className="pb-2 align-middle font-medium">Description</th>
                    <th className="pb-2 text-right align-middle font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((ln) => (
                    <tr key={ln.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 pr-2 align-middle">
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                          {ln.description || "—"}
                        </span>
                        <p className="text-slate-500">{ln.product}</p>
                        <p className="text-slate-400">
                          {ln.qty} × {fmtEUR(ln.unitPrice)} · VAT {ln.vatPct}%
                        </p>
                      </td>
                      <td className="py-2 text-right align-middle font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-100">
                        {fmtEUR(lineGross(lineNet(ln.qty, ln.unitPrice), ln.vatPct))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-6 space-y-1 border-t border-slate-200 pt-4 text-xs dark:border-slate-700">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Net</span>
                  <span className="font-mono tabular-nums">{fmtEUR(totals.net)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>VAT</span>
                  <span className="font-mono tabular-nums">{fmtEUR(totals.vat)}</span>
                </div>
                <div className="flex justify-between pt-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                  <span>Total due</span>
                  <span className="font-mono tabular-nums">
                    {fmtEUR(totals.gross)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
