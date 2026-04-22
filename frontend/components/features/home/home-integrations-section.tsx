"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Landmark } from "lucide-react";

import { cn } from "@/lib/utils";

const SNAP_SPRING = { type: "spring" as const, stiffness: 640, damping: 44 };

type LogoItem = {
  id: string;
  /** Tinted surface + ring + soft shadow (glow) per integration */
  frame: string;
  /** Wider frame for Stripe wordmark */
  frameSize?: "wordmark" | "mark";
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
    frame:
      "bg-slate-50 ring-slate-200/70 shadow-[0_8px_28px_-12px] shadow-slate-400/25 dark:bg-slate-900/50 dark:ring-slate-600/50 dark:shadow-slate-900/30",
    frameSize: "mark",
    logo: { kind: "lucide", className: "text-slate-700" },
  },
  {
    id: "hubspot",
    frame:
      "bg-orange-50/80 ring-orange-200/60 shadow-[0_8px_28px_-12px] shadow-orange-400/28 dark:bg-orange-950/25 dark:ring-orange-800/40 dark:shadow-orange-900/20",
    frameSize: "mark",
    logo: {
      kind: "image",
      src: "/images/integrations/HubSpot_Logo.svg",
      alt: "Hubspot",
    },
  },
  {
    id: "stripe",
    frame:
      "bg-violet-50/80 ring-violet-200/60 shadow-[0_10px_32px_-12px] shadow-violet-400/25 dark:bg-violet-950/25 dark:ring-violet-800/40 dark:shadow-violet-900/20",
    frameSize: "wordmark",
    logo: {
      kind: "image",
      src: "/images/integrations/Stripe_Logo,_revised_2016.svg",
      alt: "Stripe",
      shape: "wordmark",
    },
  },
  {
    id: "snowflake",
    frame:
      "bg-sky-50/80 ring-sky-200/60 shadow-[0_8px_28px_-12px] shadow-sky-400/25 dark:bg-sky-950/25 dark:ring-sky-800/40 dark:shadow-sky-900/20",
    frameSize: "mark",
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

      <ul className="flex flex-nowrap items-center justify-between gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:justify-start sm:gap-2 md:justify-between md:gap-3 [&::-webkit-scrollbar]:hidden">
        {ITEMS.map((item, i) => (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SNAP_SPRING, delay: 0.14 + i * 0.04 }}
            className="flex shrink-0 items-center justify-center"
          >
            <div
              className={cn(
                "flex items-center justify-center overflow-hidden rounded-lg px-2 py-2 ring-1 ring-inset transition-all duration-200 hover:brightness-[1.03] dark:hover:brightness-110 sm:rounded-xl sm:px-2.5 sm:py-2.5",
                item.frameSize === "wordmark"
                  ? item.id === "stripe"
                    ? "min-h-[2.75rem] min-w-[6rem] sm:min-h-[3rem] sm:min-w-[7.25rem]"
                    : "min-h-[3rem] min-w-[6.75rem] sm:min-h-[3.25rem] sm:min-w-[8.25rem]"
                  : item.id === "hubspot" || item.id === "snowflake"
                    ? "aspect-square min-h-[3.25rem] min-w-[3.25rem] sm:min-h-[3.5rem] sm:min-w-[3.5rem]"
                    : "aspect-square min-h-[3rem] min-w-[3rem] sm:min-h-[3.25rem] sm:min-w-[3.25rem]",
                item.frame
              )}
            >
              {item.logo.kind === "lucide" ? (
                <Landmark
                  className={cn("size-9 sm:size-10", item.logo.className)}
                  aria-hidden
                />
              ) : (
                <Image
                  src={item.logo.src}
                  alt={item.logo.alt}
                  width={item.logo.shape === "wordmark" ? 132 : 64}
                  height={item.logo.shape === "wordmark" ? 36 : 64}
                  sizes={
                    item.logo.shape === "wordmark"
                      ? "(max-width: 768px) 108px, 132px"
                      : "(max-width: 768px) 36px, 44px"
                  }
                  className={cn(
                    "h-auto w-auto object-contain",
                    item.logo.shape === "wordmark"
                      ? item.id === "stripe"
                        ? "max-h-6 w-auto max-w-[5.75rem] sm:max-h-7 sm:max-w-[7rem]"
                        : "max-h-7 w-auto max-w-[6rem] sm:max-h-8 sm:max-w-[7.25rem]"
                      : item.id === "hubspot" || item.id === "snowflake"
                        ? "max-h-10 max-w-10 sm:max-h-[2.75rem] sm:max-w-[2.75rem]"
                        : "max-h-8 max-w-8 sm:max-h-9 sm:max-w-9"
                  )}
                />
              )}
            </div>
          </motion.li>
        ))}
      </ul>
    </motion.section>
  );
}
