"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Landmark } from "lucide-react";

import { cn } from "@/lib/utils";

const SNAP_SPRING = { type: "spring" as const, stiffness: 640, damping: 44 };

type LogoItem = {
  id: string;
  logo:
    | {
        kind: "image";
        src: string;
        alt: string;
        shape?: "mark" | "wordmark";
      }
    | { kind: "lucide"; className: string };
};

const ITEMS: ReadonlyArray<LogoItem> = [
  {
    id: "banking",
    logo: { kind: "lucide", className: "text-slate-700" },
  },
  {
    id: "hubspot",
    logo: {
      kind: "image",
      src: "/images/integrations/HubSpot_Logo.svg",
      alt: "Hubspot",
    },
  },
  {
    id: "stripe",
    logo: {
      kind: "image",
      src: "/images/integrations/Stripe_Logo,_revised_2016.svg",
      alt: "Stripe",
      shape: "wordmark",
    },
  },
  {
    id: "snowflake",
    logo: {
      kind: "image",
      src: "/images/integrations/Snowflake_Logo.svg",
      alt: "Snowflake",
    },
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

      <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 sm:gap-x-16 md:justify-start">
        {ITEMS.map((item, i) => (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SNAP_SPRING, delay: 0.14 + i * 0.04 }}
            className="flex shrink-0 items-center justify-center"
          >
            {item.logo.kind === "lucide" ? (
              <Landmark
                className={cn("size-14 sm:size-16", item.logo.className)}
                aria-hidden
              />
            ) : (
              <Image
                src={item.logo.src}
                alt={item.logo.alt}
                width={item.logo.shape === "wordmark" ? 200 : 96}
                height={item.logo.shape === "wordmark" ? 56 : 96}
                sizes={
                  item.logo.shape === "wordmark"
                    ? "(max-width: 640px) 180px, 220px"
                    : "(max-width: 640px) 72px, 96px"
                }
                className={cn(
                  "h-auto w-auto object-contain",
                  item.logo.shape === "wordmark"
                    ? "max-h-11 min-h-[2.75rem] w-auto max-w-[min(92vw,13rem)] sm:max-h-14 sm:min-h-[3.25rem] sm:max-w-[15rem]"
                    : "max-h-14 min-h-[3.25rem] max-w-[6.5rem] sm:max-h-[4.25rem] sm:min-h-[4.25rem] sm:max-w-[7.5rem]"
                )}
              />
            )}
          </motion.li>
        ))}
      </ul>
    </motion.section>
  );
}
