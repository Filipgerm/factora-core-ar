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
  const { invoiceNumber, dueDate, counterpartyName, totalAmount, role, status } =
    invoice;

  return (
    <div className={cn(dense ? "py-2.5 pl-2 pr-3 md:pl-4 md:pr-4" : "p-4")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-foreground">{counterpartyName}</span>
        <Badge
          variant="outline"
          className="h-5 border-slate-200 px-1.5 text-[10px] font-medium uppercase tracking-wide"
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
      <p className="mt-1 font-mono text-xs text-muted-foreground tabular-nums">
        {invoiceNumber}
      </p>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="text-xs text-muted-foreground">
          Due{" "}
          <span className="tabular-nums text-foreground">
            {formatReconciliationDate(dueDate)}
          </span>
        </span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {formatReconciliationEUR(totalAmount)}
        </span>
      </div>
    </div>
  );
}
