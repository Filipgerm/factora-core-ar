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
import { formatSignupError } from "@/lib/auth/format-auth-error";
import { useSignup } from "@/lib/hooks/api/use-auth";
import { signUpRequestSchema, type SignUpRequest } from "@/lib/schemas/auth";

export function SignupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const signup = useSignup();
  const [banner, setBanner] = useState<{
    title: string;
    description: string;
  } | null>(null);

  const form = useForm<SignUpRequest>({
    resolver: zodResolver(signUpRequestSchema),
    defaultValues: { username: "", email: "", password: "" },
    mode: "onSubmit",
  });

  function clearBanner() {
    setBanner(null);
  }

  async function onSubmit(values: SignUpRequest) {
    clearBanner();
    try {
      await signup.mutateAsync(values);
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
    <div className="space-y-8">
      <header className="space-y-2 text-center sm:text-left">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Create account
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Join your finance stack
        </h2>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Use your work email. After signup you&apos;ll sign in once to reach onboarding and banking
          connections.
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
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    autoComplete="username"
                    placeholder="jane.doe"
                    minLength={2}
                    maxLength={80}
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
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    minLength={8}
                    className="h-11 border-slate-200/90 bg-white/80 transition-all duration-200 focus-visible:ring-[var(--brand-primary)]/30 dark:border-slate-700 dark:bg-slate-950/40"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      clearBanner();
                    }}
                  />
                </FormControl>
                <p className="text-xs text-slate-500 transition-colors duration-200 dark:text-slate-400">
                  Minimum 8 characters. Avoid personal or reused passwords.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col gap-3 pt-1">
            <Button
              type="submit"
              disabled={signup.isPending}
              size="lg"
              className="h-11 w-full rounded-xl bg-[var(--brand-primary)] text-white shadow-md transition-all duration-200 hover:bg-[var(--brand-primary)]/90"
            >
              {signup.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span
                    className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                    aria-hidden
                  />
                  Creating account…
                </span>
              ) : (
                "Create account"
              )}
            </Button>

            <Button variant="ghost" asChild className="w-full transition-all duration-200">
              <Link href="/home">Back to app</Link>
            </Button>
          </div>
        </form>
      </Form>

      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary underline-offset-4 transition-colors duration-200 hover:underline hover:text-primary/90"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
