import { Badge } from "@/components/ui/badge";
import type { ReconciliationBookInvoice } from "@/lib/mock-data/dashboard-mocks";
import { cn } from "@/lib/utils";

import { formatReconciliationDate, formatReconciliationEUR } from "./reconciliation-money";

interface LedgerInvoiceCellProps {
  invoice: ReconciliationBookInvoice;
  dense?: boolean;
}

export function LedgerInvoiceCell({
  invoice,
  dense = true,
}: LedgerInvoiceCellProps) {
  const {
    invoiceNumber,
    dueDate,
    counterpartyName,
    totalAmount,
    role,
    status,
    invoiceSummary,
  } = invoice;

  return (
    <div className={cn(dense ? "py-2 pl-2 pr-3 md:pl-3 md:pr-3" : "p-4")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-medium leading-snug tracking-tight text-foreground">
          {counterpartyName}
        </span>
        <Badge
          variant="outline"
          className="h-5 border-slate-200/90 px-1.5 text-[10px] font-medium uppercase tracking-wide"
        >
          {role}
        </Badge>
        <Badge
          variant="secondary"
          className={cn(
            "h-5 px-1.5 text-[10px] font-medium",
            status === "Overdue" &&
              "border border-amber-200/80 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
          )}
        >
          {status}
        </Badge>
      </div>
      <p className="mt-1 text-[8px] font-medium leading-none tracking-wide text-muted-foreground/75">
        {invoiceSummary}
      </p>
      <p className="mt-0.5 font-mono text-[11px] tabular-nums tracking-tight text-muted-foreground/90">
        {invoiceNumber}
      </p>
      <p
        className="mt-0.5 line-clamp-2 font-mono text-[11px] leading-snug tracking-tight text-foreground/85"
        title={invoice.glAccount}
      >
        {invoice.glAccount}
      </p>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="text-[13px] text-muted-foreground">
          Due{" "}
          <span className="font-mono tabular-nums text-foreground">
            {formatReconciliationDate(dueDate)}
          </span>
        </span>
        <span className="font-mono text-[13px] font-semibold tabular-nums tracking-tight text-foreground">
          {formatReconciliationEUR(totalAmount)}
        </span>
      </div>
    </div>
  );
}
