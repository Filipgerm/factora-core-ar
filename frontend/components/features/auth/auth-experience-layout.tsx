"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { AuthFormPanel } from "@/components/features/auth/auth-form-panel";

type AuthMode = "login" | "signup" | "onboarding" | "other";

function detectMode(path: string): AuthMode {
  if (path.startsWith("/login")) return "login";
  if (path.startsWith("/signup")) return "signup";
  if (path.startsWith("/onboarding")) return "onboarding";
  return "other";
}

const ctaByMode: Record<AuthMode, { href: string; label: string }> = {
  login: { href: "/signup", label: "Create an account" },
  signup: { href: "/login", label: "Sign in instead" },
  onboarding: { href: "/login", label: "Sign in" },
  other: { href: "/login", label: "Sign in" },
};

function FactoraMark({ variant }: { variant: "header" | "hero" }) {
  const isHero = variant === "hero";

  return (
    <Link
      href="/"
      className={
        isHero
          ? "group/brand relative inline-flex flex-col items-center gap-1 outline-none transition-opacity duration-200 hover:opacity-95 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-slate-950"
          : "group/brand relative inline-flex items-center outline-none transition-opacity duration-200 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-slate-950"
      }
    >
      <span
        className={
          isHero
            ? "auth-brand-halo pointer-events-none absolute inset-[-45%_-30%_-35%_-30%] rounded-full bg-[var(--brand-primary)] opacity-50 blur-3xl"
            : "auth-brand-halo pointer-events-none absolute -inset-x-12 -top-7 -bottom-7 rounded-full bg-[var(--brand-primary)] opacity-50 blur-3xl"
        }
        aria-hidden
      />
      <span
        className={
          isHero
            ? "auth-brand-halo-delayed pointer-events-none absolute inset-[-25%_-20%_-20%_-20%] rounded-full bg-blue-400/30 blur-2xl dark:bg-blue-500/20"
            : "auth-brand-halo-delayed pointer-events-none absolute -inset-x-9 -top-4 -bottom-4 rounded-full bg-blue-400/30 blur-2xl dark:bg-blue-500/20"
        }
        aria-hidden
      />
      <span
        className={
          isHero
            ? "pointer-events-none absolute inset-[12%_18%_22%_18%] rounded-full bg-purple-400/15 blur-xl dark:bg-purple-500/15"
            : "pointer-events-none absolute -bottom-3 left-[20%] right-[20%] -top-2 rounded-full bg-purple-400/15 blur-xl dark:bg-purple-500/15"
        }
        aria-hidden
      />

      <span
        className={
          isHero
            ? "relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-5xl font-semibold tracking-tighter text-transparent dark:from-white dark:via-slate-100 dark:to-slate-300 xl:text-7xl"
            : "relative text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl"
        }
      >
        Factora
      </span>

      {isHero ? (
        <span className="relative mt-2 h-px w-24 bg-gradient-to-r from-transparent via-slate-400/50 to-transparent dark:via-slate-500/40" />
      ) : null}
    </Link>
  );
}

export function AuthExperienceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const mode = detectMode(pathname);
  const cta = ctaByMode[mode];

  return (
    <div className="relative min-h-svh overflow-hidden bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100/90 text-foreground dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div
        className="auth-orb pointer-events-none absolute -left-24 top-[-10%] size-[min(42rem,90vw)] rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-600/15"
        aria-hidden
      />
      <div
        className="auth-orb-delayed pointer-events-none absolute -right-20 bottom-[-5%] size-[min(36rem,85vw)] rounded-full bg-purple-400/8 blur-3xl dark:bg-purple-500/12"
        aria-hidden
      />
      <div
        className="auth-aurora-shimmer pointer-events-none absolute left-1/3 top-1/4 size-[min(48rem,100vw)] -translate-x-1/2 rounded-full bg-[var(--brand-primary)]/8 blur-[100px] dark:bg-[var(--brand-primary)]/12"
        aria-hidden
      />

      <div
        className="auth-canvas-grid pointer-events-none absolute inset-0 opacity-70 dark:opacity-50"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-svh flex-col">
        <header className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <FactoraMark variant="header" />

          {mode !== "onboarding" ? (
            <Link
              href={cta.href}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/70 px-4 py-2 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-slate-300 hover:bg-white dark:border-slate-700/80 dark:bg-slate-900/50 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-900/80"
            >
              {cta.label}
              <ArrowRight className="size-4 text-slate-500 dark:text-slate-400" aria-hidden />
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 underline-offset-4 transition-colors duration-200 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
            >
              Use a different account
            </Link>
          )}
        </header>

        <div className="grid flex-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,38rem)] lg:items-center lg:gap-6 lg:px-10 xl:gap-10 xl:px-16 lg:pb-16">
          <aside className="relative hidden min-h-[min(60vh,28rem)] flex-col items-center justify-center lg:flex">
            <FactoraMark variant="hero" />
          </aside>

          <main className="flex flex-1 flex-col justify-center px-5 pb-12 pt-2 sm:px-8 lg:px-4 lg:pb-0 lg:pt-0">
            <div className="mx-auto w-full lg:mx-0 lg:flex lg:justify-start">
              <AuthFormPanel>{children}</AuthFormPanel>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
