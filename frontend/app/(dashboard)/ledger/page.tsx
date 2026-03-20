import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LedgerPage() {
  return (
    <Card className="border-slate-200 shadow-sm transition-all duration-200">
      <CardHeader>
        <CardTitle>Smart Ledger</CardTitle>
        <CardDescription>
          Counterparties and parsed invoices with AI confidence — table loads in
          the next commit.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Placeholder.
      </CardContent>
    </Card>
  );
}
