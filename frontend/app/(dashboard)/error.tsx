"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <Card className="w-full max-w-md border-slate-200 shadow-sm transition-all duration-200">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-amber-200/80 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/40">
              <AlertCircle className="size-5 text-amber-700 dark:text-amber-300" aria-hidden />
            </span>
            <div>
              <CardTitle className="text-lg tracking-tight">Something went wrong</CardTitle>
              <CardDescription className="text-sm">
                We couldn&apos;t load this view. Your data is safe — try again in a moment.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error.digest ? (
            <p className="font-mono text-xs text-muted-foreground">Ref: {error.digest}</p>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            onClick={() => reset()}
            className="w-full transition-all duration-200 sm:w-auto"
          >
            Try again
          </Button>
          <Button
            type="button"
            variant="outline"
            asChild
            className="w-full border-slate-200 transition-all duration-200 sm:w-auto"
          >
            <Link href="/home">Back to home</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
