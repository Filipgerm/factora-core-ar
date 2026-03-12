"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sensitive } from "@/components/ui/sensitive";
import { VisibleWhen } from "@/components/visible-when";
import { formatCurrency } from "@/lib/utils/format-currency";
import { formatPercentage } from "@/lib/utils/format-number";

interface ConnectedServices {
  bank: boolean;
  erp: boolean;
  ecommerce?: boolean;
  bankName?: string;
  erpName?: string;
  ecommerceName?: string;
}

interface KPI {
  label: string;
  value: number;
  currency?: string;
  digits?: number;
  suffix?: string;
}

interface PLKpiCardsProps {
  kpis: KPI[];
  connectedServices?: ConnectedServices;
}

export function PLKpiCards({ kpis, connectedServices }: PLKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="pl-kpi-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                {kpi.label}
              </h3>
              <Badge variant="secondary">2025</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <VisibleWhen requires={["bank"]} connectedServices={connectedServices}>
              <div className="text-2xl font-bold text-foreground">
                {kpi.currency ? (
                  <Sensitive>
                    {formatCurrency(kpi.value, kpi.currency, {
                      minimumFractionDigits: kpi.digits ?? 2,
                      maximumFractionDigits: kpi.digits ?? 2,
                    })}
                  </Sensitive>
                ) : (
                  <Sensitive>
                    {kpi.value}
                    {kpi.suffix ?? ""}
                  </Sensitive>
                )}
              </div>
            </VisibleWhen>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

