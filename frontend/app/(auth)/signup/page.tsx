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
import { formatSignupError } from "@/lib/auth/format-auth-error";
import { useSignup } from "@/lib/hooks/api/use-auth";
import { signUpRequestSchema } from "@/lib/schemas/auth";

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const signup = useSignup();
  const [username, setUsername] = useState("");
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
    const parsed = signUpRequestSchema.safeParse({ username, email, password });
    if (!parsed.success) {
      const description =
        parsed.error.issues.map((i) => i.message).join(" ") ||
        "Please review the fields below.";
      setBanner({
        title: "Almost there",
        description,
      });
      return;
    }
    try {
      await signup.mutateAsync(parsed.data);
      toast({
        title: "Welcome aboard",
        description: "Your account is ready. Sign in with the password you chose.",
      });
      router.push("/login");
      router.refresh();
    } catch (err) {
      setBanner({
        title: "We couldn't finish signup",
        description: formatSignupError(err),
      });
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-6">
      <Card className="w-full max-w-md border-slate-200 shadow-sm transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-xl tracking-tight">Create your account</CardTitle>
          <CardDescription>
            Join Factora with your work email. You&apos;ll sign in afterward to access your
            workspace.
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
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  clearBanner();
                }}
                required
                minLength={2}
                maxLength={80}
                className="transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
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
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearBanner();
                }}
                required
                minLength={8}
                className="transition-all duration-200"
              />
              <p className="text-xs text-slate-500 transition-colors duration-200 dark:text-slate-400">
                At least 8 characters.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-between">
              <Button type="submit" disabled={signup.isPending} className="transition-all duration-200">
                {signup.isPending ? "Creating account…" : "Create account"}
              </Button>
              <Button variant="ghost" asChild className="transition-all duration-200">
                <Link href="/home">Back to app</Link>
              </Button>
            </div>
            <p className="text-center text-sm text-slate-600 dark:text-slate-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-slate-900 underline-offset-4 transition-colors duration-200 hover:text-slate-700 hover:underline dark:text-slate-100 dark:hover:text-white"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
