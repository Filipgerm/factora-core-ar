"use client";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useGlPeriodsQuery,
  usePatchGlPeriodMutation,
} from "@/lib/hooks/api/use-general-ledger";
import type { GlAccountingPeriod } from "@/lib/schemas/general-ledger";

function statusBadge(s: GlAccountingPeriod["status"]) {
  if (s === "open")
    return (
      <Badge className="bg-emerald-600 text-[10px] hover:bg-emerald-600">Open</Badge>
    );
  if (s === "soft_close")
    return <Badge variant="secondary" className="text-[10px]">Soft close</Badge>;
  return <Badge variant="destructive" className="text-[10px]">Hard close</Badge>;
}

export function GlPeriodsView() {
  const { data: periods = [], isLoading } = useGlPeriodsQuery();
  const patch = usePatchGlPeriodMutation();

  return (
    <div className="overflow-hidden rounded-xl border border-slate-100">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
            <TableHead className="text-xs">Period</TableHead>
            <TableHead className="text-xs">Range</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Change</TableHead>
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
          {!isLoading && periods.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                No periods. Run demo seed.
              </TableCell>
            </TableRow>
          )}
          {periods.map((p) => (
            <TableRow
              key={p.id}
              className="border-slate-100 transition-colors duration-200 hover:bg-slate-50/80"
            >
              <TableCell className="text-xs font-medium">{p.label}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {p.period_start} → {p.period_end}
              </TableCell>
              <TableCell className="text-xs">{statusBadge(p.status)}</TableCell>
              <TableCell className="text-xs">
                <Select
                  value={p.status}
                  onValueChange={(v) =>
                    void patch.mutateAsync({
                      periodId: p.id,
                      status: v as GlAccountingPeriod["status"],
                    })
                  }
                  disabled={patch.isPending}
                >
                  <SelectTrigger className="h-8 w-[140px] text-xs transition-all duration-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="soft_close">Soft close</SelectItem>
                    <SelectItem value="hard_close">Hard close</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
