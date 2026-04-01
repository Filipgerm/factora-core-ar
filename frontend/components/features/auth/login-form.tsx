"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AuthFormError } from "@/components/features/auth/auth-form-error";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatLoginError } from "@/lib/auth/format-auth-error";
import { useLoginMutation } from "@/lib/hooks/api/use-auth";
import { loginRequestSchema, type LoginRequest } from "@/lib/schemas/auth";

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const login = useLoginMutation();
  const [banner, setBanner] = useState<{
    title: string;
    description: string;
  } | null>(null);

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
  });

  function clearBanner() {
    setBanner(null);
  }

  async function onSubmit(values: LoginRequest) {
    clearBanner();
    try {
      const auth = await login.mutateAsync(values);
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
    <div className="space-y-8">
      <header className="space-y-2 text-center sm:text-left">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Sign in
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Access your workspace
        </h2>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Use your Factora credentials. Your session stays in memory — refresh tokens remain in an
          httpOnly cookie.
        </p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {banner ? (
            <AuthFormError
              key={banner.description}
              title={banner.title}
              description={banner.description}
            />
          ) : null}

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    className="h-11 border-slate-200/90 bg-white/80 transition-all duration-200 focus-visible:ring-[var(--brand-primary)]/30 dark:border-slate-700 dark:bg-slate-950/40"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      clearBanner();
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="h-11 border-slate-200/90 bg-white/80 transition-all duration-200 focus-visible:ring-[var(--brand-primary)]/30 dark:border-slate-700 dark:bg-slate-950/40"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      clearBanner();
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col gap-3 pt-1">
            <Button
              type="submit"
              disabled={login.isPending}
              size="lg"
              className="h-11 w-full rounded-xl bg-[var(--brand-primary)] text-white shadow-md transition-all duration-200 hover:bg-[var(--brand-primary)]/90"
            >
              <span className="relative">
                {login.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span
                      className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                      aria-hidden
                    />
                    Signing in…
                  </span>
                ) : (
                  "Sign in"
                )}
              </span>
            </Button>

            <Button variant="ghost" asChild className="w-full transition-all duration-200">
              <Link href="/home">Back to app</Link>
            </Button>
          </div>
        </form>
      </Form>

      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-semibold text-[var(--brand-primary)] underline-offset-4 transition-colors duration-200 hover:underline dark:text-teal-400"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
