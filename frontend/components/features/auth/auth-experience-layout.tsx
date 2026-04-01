"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Globe2,
  Layers,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";

type AuthMode = "login" | "signup" | "onboarding" | "other";

function detectMode(path: string): AuthMode {
  if (path.startsWith("/login")) return "login";
  if (path.startsWith("/signup")) return "signup";
  if (path.startsWith("/onboarding")) return "onboarding";
  return "other";
}

const copy: Record<
  AuthMode,
  { eyebrow: string; title: string; subtitle: string; ctaHref: string; ctaLabel: string }
> = {
  login: {
    eyebrow: "Secure access",
    title: "Welcome back to your ledger",
    subtitle:
      "Pick up cash reconciliation, invoicing, and tax sync where you left off — with full audit trails.",
    ctaHref: "/signup",
    ctaLabel: "Create an account",
  },
  signup: {
    eyebrow: "Start in minutes",
    title: "The operating system for modern finance",
    subtitle:
      "Unify AR, AP, banking, and compliance in one AI-native workspace built for European scale.",
    ctaHref: "/login",
    ctaLabel: "Sign in instead",
  },
  onboarding: {
    eyebrow: "One last step",
    title: "Anchor your organization",
    subtitle:
      "Name your legal entity so invoices, counterparties, and tax filings stay scoped correctly.",
    ctaHref: "/login",
    ctaLabel: "Sign in",
  },
  other: {
    eyebrow: "Factora",
    title: "Financial clarity, end to end",
    subtitle: "Sign in or create an account to continue.",
    ctaHref: "/login",
    ctaLabel: "Sign in",
  },
};

const highlights = [
  {
    icon: ShieldCheck,
    title: "Tenant isolation",
    body: "Every query is scoped to your organization — no cross-tenant leakage.",
  },
  {
    icon: Zap,
    title: "AI-assisted flows",
    body: "Ingestion and reconciliation that learns from your feedback loop.",
  },
  {
    icon: Globe2,
    title: "Built for Europe",
    body: "Greek myDATA today; patterns that extend across markets you enter next.",
  },
] as const;

export function AuthExperienceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const mode = detectMode(pathname);
  const c = copy[mode];

  return (
    <div className="relative min-h-svh overflow-hidden bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100/90 text-foreground dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Ambient orbs — brand + fintech accent (Tailwind palette + CSS vars) */}
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
          <Link
            href="/"
            className="group flex items-center gap-3 transition-opacity duration-200 hover:opacity-90"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--brand-primary)] text-sm font-semibold tracking-tight text-white shadow-md shadow-slate-900/10 ring-1 ring-white/20 transition-transform duration-200 group-hover:scale-[1.02] dark:shadow-black/30">
              F
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Factora
              </span>
              <span className="text-xs text-slate-500 transition-colors duration-200 dark:text-slate-400">
                AI-native ERP
              </span>
            </span>
          </Link>

          {mode !== "onboarding" ? (
            <Link
              href={c.ctaHref}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/70 px-4 py-2 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-slate-300 hover:bg-white dark:border-slate-700/80 dark:bg-slate-900/50 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-900/80"
            >
              {c.ctaLabel}
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

        <div className="flex flex-1 flex-col lg:grid lg:min-h-0 lg:grid-cols-[1.05fr_minmax(0,440px)] lg:gap-8 lg:px-8 lg:pb-12">
          {/* Narrative column */}
          <aside className="relative hidden flex-col justify-center px-5 pb-6 pt-2 lg:flex lg:px-4 xl:pr-12">
            <div className="absolute left-8 top-1/2 hidden w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-slate-300/60 to-transparent dark:via-slate-600/50 xl:block" />

            <div className="relative space-y-8 pl-0 xl:pl-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/60 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300">
                <Sparkles className="size-3.5 text-purple-500 dark:text-purple-400" aria-hidden />
                {c.eyebrow}
              </div>

              <div className="space-y-4">
                <h1 className="max-w-lg text-balance text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 xl:text-4xl">
                  {c.title}
                </h1>
                <p className="max-w-md text-pretty text-base leading-relaxed text-slate-600 dark:text-slate-400">
                  {c.subtitle}
                </p>
              </div>

              <ul className="grid max-w-lg gap-4">
                {highlights.map(({ icon: Icon, title, body }) => (
                  <li
                    key={title}
                    className="group flex gap-4 rounded-2xl border border-slate-200/60 bg-white/50 p-4 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-slate-300/80 hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/35 dark:hover:border-slate-700/80"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)] ring-1 ring-slate-200/50 transition-transform duration-200 group-hover:scale-105 dark:ring-slate-700/50">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                        {title}
                      </p>
                      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{body}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-slate-500 dark:text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <Layers className="size-4 text-slate-400 dark:text-slate-500" aria-hidden />
                  Ledger-grade immutability
                </span>
                <span className="inline-flex items-center gap-2">
                  <Building2 className="size-4 text-slate-400 dark:text-slate-500" aria-hidden />
                  Multi-entity ready
                </span>
              </div>
            </div>
          </aside>

          {/* Mobile hero strip */}
          <div className="border-b border-slate-200/60 bg-white/40 px-5 py-6 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-900/30 lg:hidden">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {c.eyebrow}
            </p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              {c.title}
            </h1>
          </div>

          {/* Form column */}
          <main className="flex flex-1 flex-col justify-center px-5 pb-10 pt-6 sm:px-8 lg:px-4 lg:pb-0 lg:pt-0">
            <div
              className={cn(
                "relative mx-auto w-full max-w-md",
                "rounded-2xl border border-slate-200/80 bg-white/75 p-6 shadow-xl shadow-slate-900/[0.04] backdrop-blur-xl",
                "ring-1 ring-white/60 dark:border-slate-700/70 dark:bg-slate-900/55 dark:shadow-black/20 dark:ring-white/5",
                "before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/80 before:via-transparent before:to-blue-50/30 before:opacity-90 dark:before:from-slate-800/20 dark:before:to-purple-950/20",
                "transition-all duration-300 ease-out"
              )}
            >
              <div className="relative z-10">{children}</div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
