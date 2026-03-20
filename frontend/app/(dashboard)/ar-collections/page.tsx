import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ArCollectionsPage() {
  return (
    <Card className="border-slate-200 shadow-sm transition-all duration-200">
      <CardHeader>
        <CardTitle>AR Collections</CardTitle>
        <CardDescription>
          Monitor overdue invoices and draft or send follow-ups with guardrails.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Phase 1 placeholder — collections agent UI ships in a later slice.
      </CardContent>
    </Card>
  );
}
