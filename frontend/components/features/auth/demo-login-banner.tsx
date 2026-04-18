"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { useIsDemoMode } from "@/components/providers/auth-session-provider";
import { Button } from "@/components/ui/button";
import { useDemoLoginMutation } from "@/lib/hooks/api/use-auth";

export function DemoLoginBanner() {
  const isDemoMode = useIsDemoMode();
  const router = useRouter();
  const demoLogin = useDemoLoginMutation();

  if (!isDemoMode) return null;

  async function handleEnterDemo() {
    const auth = await demoLogin.mutateAsync();
    router.push(auth.organization_id ? "/home" : "/onboarding");
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-purple-200/60 bg-gradient-to-br from-purple-50 to-blue-50 p-5 dark:border-purple-800/40 dark:from-purple-950/30 dark:to-blue-950/30">
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/50">
          <Sparkles className="size-4 text-purple-600 dark:text-purple-400" aria-hidden />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Explore the demo
          </p>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            See Factora in action with pre-loaded sample data — no account needed.
          </p>
        </div>
      </div>
      <Button
        onClick={handleEnterDemo}
        disabled={demoLogin.isPending}
        className="mt-4 h-10 w-full rounded-lg bg-purple-600 text-sm text-white shadow-sm transition-all duration-200 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600"
      >
        {demoLogin.isPending ? (
          <span className="flex items-center justify-center gap-2">
            <span
              className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
              aria-hidden
            />
            Loading demo…
          </span>
        ) : (
          <span className="flex items-center justify-center gap-1.5">
            <Sparkles className="size-3.5" aria-hidden />
            Enter Demo
          </span>
        )}
      </Button>
    </div>
  );
}
