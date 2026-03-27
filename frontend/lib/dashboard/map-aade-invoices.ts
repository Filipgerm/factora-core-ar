import { differenceInCalendarDays, parseISO } from "date-fns";

import type { ArInvoicePipeline, ArInvoiceRow } from "@/lib/views/ar";
import type { AadeDocumentsResponse } from "@/lib/schemas/dashboard";
import type { InvoiceResponse } from "@/lib/schemas/invoices";

function num(
  v: number | string | null | undefined
): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const p = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(p) ? p : 0;
}

function pipelineFromAadeIssueDate(
  issueDate: string | null | undefined
): ArInvoicePipeline {
  if (!issueDate) return "sent";
  try {
    const d = parseISO(issueDate);
    const days = differenceInCalendarDays(new Date(), d);
    if (days > 60) return "overdue"; // TODO: Phase 3 Backend — real open/closed from invoice state
    return "sent";
  } catch {
    return "sent";
  }
}

/** Map AADE myDATA documents to AR table rows (not native Factora invoices). */
export function aadeDocumentsToArInvoiceRows(
  res: AadeDocumentsResponse
): ArInvoiceRow[] {
  return res.invoices.map((inv) => {
    const gross = num(inv.total_gross_value);
    const net = num(inv.total_net_value);
    const amount = gross || net;
    const hasMark = inv.mark != null && inv.mark !== 0;
    const issue = inv.issue_date ?? null;
    const seriesAa = [inv.series, inv.aa].filter(Boolean).join("-");
    const invoiceNumber = seriesAa || inv.document_id?.slice(0, 12) || inv.id;
    const vat = inv.counterpart_vat?.trim();
    return {
      id: inv.id,
      invoiceNumber,
      customerName: vat ? `Counterpart ${vat}` : "—", // TODO: Phase 3 Backend — resolve counterparty name
      customerTaxLabel: vat ? `VAT: ${vat}` : "—",
      amount,
      dueDate: null, // TODO: Phase 3 Backend — payment due from AADE if available
      issueDate: issue,
      pipeline: pipelineFromAadeIssueDate(issue),
      mydataStatus: hasMark ? "transmitted" : "pending",
      mydataMark: hasMark ? String(inv.mark) : null,
      paidAt: null,
    };
  });
}

function pipelineFromUnifiedStatus(status: string): ArInvoicePipeline {
  const s = status.toLowerCase();
  if (s === "draft" || s === "pending_review") return "draft";
  if (s === "paid") return "paid";
  if (s === "overdue") return "overdue";
  if (s === "partially_paid" || s === "partial") return "partially_paid";
  // TODO: Phase 3 Backend — align invoice status enum with AR pipeline
  return "sent";
}

function mydataStatusForUnifiedSource(source: InvoiceResponse["source"]): ArInvoiceRow["mydataStatus"] {
  if (source === "aade") return "pending";
  return "not_applicable";
}

/** Map unified ``invoices`` rows (manual, Gmail, OCR, CSV) into AR table rows. */
export function manualInvoicesToArInvoiceRows(
  items: InvoiceResponse[]
): ArInvoiceRow[] {
  return items.map((inv) => ({
    id: `inv-${inv.id}`,
    invoiceNumber:
      inv.source === "manual"
        ? "Manual"
        : inv.source === "aade"
          ? "AADE"
          : inv.source === "gmail"
            ? "Gmail"
            : inv.source.toUpperCase(),
    customerName: inv.counterparty_display_name ?? "—",
    customerTaxLabel: `${inv.source} · ${inv.status}`,
    amount: Number(inv.amount),
    dueDate: inv.due_date,
    issueDate: inv.issue_date,
    pipeline: pipelineFromUnifiedStatus(inv.status),
    mydataStatus: mydataStatusForUnifiedSource(inv.source),
    mydataMark:
      inv.source === "aade"
        ? inv.external_id
        : inv.external_id
          ? `Ref: ${inv.external_id.slice(0, 12)}…`
          : null,
    paidAt: null,
  }));
}

export function arInvoiceKpisFromRows(rows: ArInvoiceRow[]) {
  const open = rows.filter(
    (r) =>
      r.pipeline === "sent" ||
      r.pipeline === "overdue" ||
      r.pipeline === "draft"
  );
  const overdue = rows.filter((r) => r.pipeline === "overdue");
  const sum = (xs: ArInvoiceRow[]) =>
    xs.reduce((a, r) => a + r.amount, 0);
  const now = new Date();
  const filedThisMonth = rows.filter((r) => {
    if (r.mydataStatus !== "transmitted" || !r.issueDate) return false;
    try {
      const d = parseISO(r.issueDate);
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth()
      );
    } catch {
      return false;
    }
  });
  return {
    totalOutstanding: { amount: sum(open), count: open.length },
    dueWithin30Days: { amount: 0, count: 0 }, // TODO: Phase 3 Backend — due dates
    overdue: { amount: sum(overdue), count: overdue.length },
    paidThisMonth: {
      amount: sum(filedThisMonth),
      count: filedThisMonth.length,
    },
  };
}
