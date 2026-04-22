"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Check, Landmark } from "lucide-react";

import { cn } from "@/lib/utils";

const SNAP_SPRING = { type: "spring" as const, stiffness: 640, damping: 44 };

type IntegrationItem = {
  id: string;
  label: string;
  logo:
    | {
        kind: "image";
        src: string;
        alt: string;
        /** Wordmark logos get a wider tile so the glyph stays legible. */
        shape?: "mark" | "wordmark";
      }
    | { kind: "lucide"; className: string };
  tint: string;
};

const ITEMS: ReadonlyArray<IntegrationItem> = [
  {
    id: "banking",
    label: "Banking",
    logo: { kind: "lucide", className: "text-slate-700" },
    tint: "bg-slate-50 text-slate-700 ring-slate-200/70",
  },
  {
    id: "hubspot",
    label: "Hubspot",
    logo: {
      kind: "image",
      src: "/images/integrations/HubSpot_Logo.svg",
      alt: "Hubspot",
    },
    tint: "bg-orange-50/70 text-orange-700 ring-orange-200/70",
  },
  {
    id: "stripe",
    label: "Stripe",
    logo: {
      kind: "image",
      src: "/images/integrations/Stripe_Logo,_revised_2016.svg",
      alt: "Stripe",
      shape: "wordmark",
    },
    tint: "bg-violet-50/70 text-violet-700 ring-violet-200/70",
  },
  {
    id: "snowflake",
    label: "Snowflake",
    logo: {
      kind: "image",
      src: "/images/integrations/Snowflake_Logo.svg",
      alt: "Snowflake",
    },
    tint: "bg-sky-50/70 text-sky-700 ring-sky-200/70",
  },
];

export function HomeIntegrationsSection({ className }: { className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SNAP_SPRING, delay: 0.1 }}
      className={cn(
        "rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-14px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950",
        className
      )}
    >
      <header className="mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          Integrations
        </h2>
      </header>

      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {ITEMS.map((item, i) => (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SNAP_SPRING, delay: 0.14 + i * 0.04 }}
            className="group flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-3 transition-colors duration-200 hover:border-slate-200 hover:bg-white dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-900"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={cn(
                  "flex h-14 shrink-0 items-center justify-center overflow-hidden rounded-lg px-1.5 ring-1 ring-inset",
                  item.logo.kind === "image" && item.logo.shape === "wordmark"
                    ? "min-w-[5.5rem]"
                    : "w-14",
                  item.tint
                )}
                aria-hidden
              >
                {item.logo.kind === "lucide" ? (
                  <Landmark className={cn("size-8", item.logo.className)} />
                ) : (
                  <Image
                    src={item.logo.src}
                    alt={item.logo.alt}
                    width={item.logo.shape === "wordmark" ? 88 : 48}
                    height={48}
                    className={cn(
                      "h-auto max-h-10 w-auto object-contain",
                      item.logo.shape === "wordmark"
                        ? "max-w-[5rem]"
                        : "max-w-10"
                    )}
                  />
                )}
              </div>
              <span className="truncate text-xs font-semibold tracking-tight text-slate-800 dark:text-slate-100">
                {item.label}
              </span>
            </div>
            <span
              className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 ring-1 ring-inset ring-emerald-500/20"
              aria-label="connected"
            >
              <Check className="size-2.5" strokeWidth={3} aria-hidden />
            </span>
          </motion.li>
        ))}
      </ul>
    </motion.section>
  );
}
