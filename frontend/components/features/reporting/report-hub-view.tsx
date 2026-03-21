"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Pin, Star } from "lucide-react";

import { reportHubSections } from "@/lib/mock-data/report-hub-mocks";
import { cn } from "@/lib/utils";

const SNAP_SPRING = { type: "spring" as const, stiffness: 560, damping: 42 };

const ICON_BACKDROPS = [
  "bg-violet-100 text-violet-700 dark:bg-violet-950/45 dark:text-violet-300",
  "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  "bg-amber-100 text-amber-900 dark:bg-amber-950/35 dark:text-amber-200",
  "bg-orange-100 text-orange-900 dark:bg-orange-950/35 dark:text-orange-200",
  "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-200",
];

function backdropForIndex(i: number) {
  return ICON_BACKDROPS[i % ICON_BACKDROPS.length];
}

export function ReportHubView() {
  const initialPrefs = useMemo(() => {
    const m: Record<string, { star: boolean; pin: boolean }> = {};
    for (const s of reportHubSections) {
      for (const r of s.reports) {
        m[r.id] = {
          star: r.defaultStarred ?? false,
          pin: r.defaultPinned ?? false,
        };
      }
    }
    return m;
  }, []);

  const [prefs, setPrefs] = useState(initialPrefs);

  const toggleStar = useCallback((id: string) => {
    setPrefs((p) => ({
      ...p,
      [id]: { ...p[id], star: !p[id].star },
    }));
  }, []);

  const togglePin = useCallback((id: string) => {
    setPrefs((p) => ({
      ...p,
      [id]: { ...p[id], pin: !p[id].pin },
    }));
  }, []);

  return (
    <div className="space-y-10 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SNAP_SPRING}
      >
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Reporting
        </h1>
        <p className="mt-1 max-w-2xl text-sm tracking-tight text-muted-foreground">
          Financial statements, analytics, and close reports. Favorites and pins
          are stored locally for this demo.
        </p>
      </motion.div>

      {reportHubSections.map((section, si) => (
        <motion.section
          key={section.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SNAP_SPRING, delay: 0.04 + si * 0.05 }}
          className="space-y-4"
        >
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {section.title}
          </h2>
          <div
            className={cn(
              "grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
              section.id === "tax-compliance" && "max-w-lg xl:max-w-xl"
            )}
          >
            {section.reports.map((r, ri) => {
              const idx = si * 40 + ri;
              const Icon = r.icon;
              const { star, pin } = prefs[r.id] ?? {
                star: false,
                pin: false,
              };
              const taxProminent = section.id === "tax-compliance";
              return (
                <motion.div
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    ...SNAP_SPRING,
                    delay: Math.min(0.12 + idx * 0.012, 0.45),
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border border-slate-200/90 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow duration-200 hover:shadow-md dark:border-slate-800 dark:bg-background",
                    taxProminent &&
                      "rounded-xl border-2 border-teal-200/55 bg-[var(--brand-primary-subtle)] p-4 shadow-[0_8px_32px_-14px_rgba(47,154,138,0.22)] dark:border-teal-800/50 dark:bg-teal-950/20"
                  )}
                >
                  {r.href ? (
                    <Link
                      href={r.href}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-offset-2 transition-colors duration-200 hover:bg-slate-50/90 focus-visible:outline focus-visible:outline-ring dark:hover:bg-slate-900/40"
                    >
                      <div
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg",
                          backdropForIndex(idx)
                        )}
                        aria-hidden
                      >
                        <Icon className="size-4 opacity-90" />
                      </div>
                      <span className="min-w-0 flex-1 text-sm font-medium leading-snug tracking-tight text-foreground">
                        {r.title}
                      </span>
                    </Link>
                  ) : (
                    <>
                      <div
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg",
                          backdropForIndex(idx)
                        )}
                        aria-hidden
                      >
                        <Icon className="size-4 opacity-90" />
                      </div>
                      <span className="min-w-0 flex-1 text-sm font-medium leading-snug tracking-tight text-foreground">
                        {r.title}
                      </span>
                    </>
                  )}
                  <div className="flex shrink-0 items-center gap-0.5">
                    {section.id === "favorites" ? (
                      <span
                        className="flex size-8 items-center justify-center text-amber-500"
                        title="In Favourites"
                        aria-hidden
                      >
                        <Star className="size-4 fill-amber-400 text-amber-500" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        title={star ? "Remove from favorites" : "Add to favorites"}
                        className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleStar(r.id);
                        }}
                      >
                        <Star
                          className={cn(
                            "size-4",
                            star
                              ? "fill-amber-400 text-amber-500"
                              : "opacity-60"
                          )}
                          aria-hidden
                        />
                        <span className="sr-only">Favorite</span>
                      </button>
                    )}
                    <button
                      type="button"
                      title={pin ? "Unpin" : "Pin"}
                      className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        togglePin(r.id);
                      }}
                    >
                      <Pin
                        className={cn(
                          "size-4",
                          pin
                            ? "fill-[var(--brand-primary)] text-[var(--brand-primary)]"
                            : "opacity-60"
                        )}
                        aria-hidden
                      />
                      <span className="sr-only">Pin</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>
      ))}
    </div>
  );
}
