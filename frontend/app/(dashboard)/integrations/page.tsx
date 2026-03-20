import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function IntegrationsPage() {
  return (
    <Card className="border-slate-200 shadow-sm transition-all duration-200">
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>
          Connect banks, ERPs, and tax authority feeds. This area will list
          active connections and setup flows.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Phase 1 placeholder — wiring comes next.
      </CardContent>
    </Card>
  );
}
