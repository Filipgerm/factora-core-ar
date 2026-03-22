"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { isApiError } from "@/lib/api/types";
import { useLoginMutation } from "@/lib/hooks/api/use-auth";
import { loginRequestSchema } from "@/lib/schemas/auth";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const login = useLoginMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = loginRequestSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast({
        title: "Check your input",
        description: parsed.error.flatten().formErrors.join(" "),
        variant: "destructive",
      });
      return;
    }
    try {
      await login.mutateAsync(parsed.data);
      toast({ title: "Signed in" });
      router.push("/home");
      router.refresh();
    } catch (err) {
      const msg = isApiError(err) ? err.message : "Sign-in failed";
      toast({ title: "Sign-in failed", description: msg, variant: "destructive" });
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-6">
      <Card className="w-full max-w-md border-slate-200 shadow-sm transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-xl tracking-tight">Sign in</CardTitle>
          <CardDescription>
            Use your Factora account. New users can register via the API{" "}
            <code className="text-xs">POST /v1/auth/signup</code> first.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button type="submit" disabled={login.isPending}>
              {login.isPending ? "Signing in…" : "Sign in"}
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/home">Back to app</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
