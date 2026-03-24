"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthFormError } from "@/components/features/auth/auth-form-error";
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
import { formatLoginError } from "@/lib/auth/format-auth-error";
import { useLoginMutation } from "@/lib/hooks/api/use-auth";
import { loginRequestSchema } from "@/lib/schemas/auth";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const login = useLoginMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [banner, setBanner] = useState<{
    title: string;
    description: string;
  } | null>(null);

  function clearBanner() {
    setBanner(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearBanner();
    const parsed = loginRequestSchema.safeParse({ email, password });
    if (!parsed.success) {
      const description =
        parsed.error.issues.map((i) => i.message).join(" ") ||
        "Please check your email and password.";
      setBanner({
        title: "Check your details",
        description,
      });
      return;
    }
    try {
      const auth = await login.mutateAsync(parsed.data);
      toast({ title: "Signed in" });
      router.push(auth.organization_id ? "/home" : "/onboarding");
      router.refresh();
    } catch (err) {
      setBanner({
        title: "Those credentials didn't work",
        description: formatLoginError(err),
      });
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-6">
      <Card className="w-full max-w-md border-slate-200 shadow-sm transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-xl tracking-tight">Sign in</CardTitle>
          <CardDescription>
            Use your Factora account to continue to your organization and banking data.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit} noValidate>
          <CardContent className="space-y-4">
            {banner ? (
              <AuthFormError
                key={banner.description}
                title={banner.title}
                description={banner.description}
              />
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearBanner();
                }}
                required
                className="transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearBanner();
                }}
                required
                className="transition-all duration-200"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-between">
              <Button type="submit" disabled={login.isPending} className="transition-all duration-200">
                {login.isPending ? "Signing in…" : "Sign in"}
              </Button>
              <Button variant="ghost" asChild className="transition-all duration-200">
                <Link href="/home">Back to app</Link>
              </Button>
            </div>
            <p className="text-center text-sm text-slate-600 dark:text-slate-400">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-medium text-slate-900 underline-offset-4 transition-colors duration-200 hover:text-slate-700 hover:underline dark:text-slate-100 dark:hover:text-white"
              >
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
