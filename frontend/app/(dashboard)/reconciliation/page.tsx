import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ReconciliationPage() {
  return (
    <Card className="border-slate-200 shadow-sm transition-all duration-200">
      <CardHeader>
        <CardTitle>Reconciliation</CardTitle>
        <CardDescription>
          Match bank lines to invoices with AI suggestions and human review.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Phase 1 placeholder — Smart Ledger is the first surface.
      </CardContent>
    </Card>
  );
}
