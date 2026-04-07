"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useGlAccountsQuery } from "@/lib/hooks/api/use-general-ledger";
import { useGlRecurringTemplatesQuery } from "@/lib/hooks/api/use-general-ledger";
import { useLedgerView } from "@/components/features/general-ledger/ledger-view-context";
import { formatLedgerMoney } from "@/components/features/general-ledger/gl-money";

export function GlRecurringView() {
  const { effectiveEntityId, consolidated } = useLedgerView();
  const { data: templates = [], isLoading } = useGlRecurringTemplatesQuery({
    legal_entity_id: effectiveEntityId,
    consolidated,
  });
  const { data: accounts = [] } = useGlAccountsQuery();
  const acc = Object.fromEntries(accounts.map((a) => [a.id, a]));

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Recurring entry templates (monthly / quarterly, day-of-month). Automated
        posting is out of scope — this is template management only.
      </p>
      <div className="overflow-hidden rounded-xl border border-slate-100">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
              <TableHead className="text-xs">Template</TableHead>
              <TableHead className="text-xs">Frequency</TableHead>
              <TableHead className="text-xs">Day</TableHead>
              <TableHead className="text-xs">Lines</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-xs text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && templates.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  No templates.
                </TableCell>
              </TableRow>
            )}
            {templates.map((t) => (
              <TableRow
                key={t.id}
                className="border-slate-100 align-top transition-colors duration-200 hover:bg-slate-50/80"
              >
                <TableCell className="text-xs">
                  <div className="font-medium">{t.name}</div>
                  {t.memo && (
                    <div className="text-muted-foreground">{t.memo}</div>
                  )}
                  {t.is_active ? (
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      Inactive
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs capitalize">{t.frequency}</TableCell>
                <TableCell className="text-xs tabular-nums">{t.day_of_month}</TableCell>
                <TableCell className="text-xs">
                  <ul className="space-y-1">
                    {t.template_lines.map((ln) => {
                      const a = acc[ln.account_id];
                      return (
                        <li key={ln.id} className="tabular-nums text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {a?.code}
                          </span>{" "}
                          D {formatLedgerMoney(ln.debit, "EUR")} / C{" "}
                          {formatLedgerMoney(ln.credit, "EUR")}
                        </li>
                      );
                    })}
                  </ul>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
