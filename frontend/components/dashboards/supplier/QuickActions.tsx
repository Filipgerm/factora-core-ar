import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, Bot, DollarSign } from "lucide-react";

type QuickActionsProps = {
  onCreditCheck: () => void;
  onAICopilot: () => void;
  loading?: boolean;
};

const ActionSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {[1, 2].map((key) => (
      <Card
        key={key}
        className="flex flex-col justify-between home-action bg-white border-slate-200"
      >
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-muted rounded-lg h-12 w-12 animate-pulse" />
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-4 w-56 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-10 w-full bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export function QuickActions({
  onCreditCheck,
  onAICopilot,
  loading = false,
}: QuickActionsProps) {
  if (loading) return <ActionSkeleton />;

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-slate-900 mb-6">Quick Actions</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col justify-between home-action bg-white border-slate-200 hover:shadow-lg transition-all duration-200 hover:border-primary/40">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-primary/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-brand-primary" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-900">
                  Onboard a new customer
                </CardTitle>
              </div>
            </div>
            <CardDescription className="text-slate-600">
              Check customer eligibility for flexible payment options and send onboarding
              invitations.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              onClick={onCreditCheck}
              className="w-full font-semibold py-3 rounded-lg transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <span>Add Customer</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between home-action bg-white border-slate-200 hover:shadow-lg transition-all duration-200 hover:border-primary/40">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-900">Ask AI Copilot</CardTitle>
              </div>
            </div>
            <CardDescription className="text-slate-600">
              Get AI-powered insights and assistance for your financial analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              onClick={onAICopilot}
              className="w-full font-semibold py-3 rounded-lg transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <span>Open AI Copilot</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div >
  );
}

