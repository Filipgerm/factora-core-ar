"use client";

import { useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Brain, CheckCircle2, Loader2, UploadCloud, Zap } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STEP_MS = 1000;

export function ImportDataButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const onFilesSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      const n = files?.length ?? 0;
      if (n === 0) {
        e.target.value = "";
        return;
      }

      const handle = toast({
        title: "Scanning document…",
        description: (
          <span className="flex items-center gap-2 text-sm">
            <Loader2
              className="size-4 shrink-0 animate-spin text-[var(--brand-primary)]"
              aria-hidden
            />
            Preparing your files for ingestion.
          </span>
        ),
      });

      window.setTimeout(() => {
        handle.update({
          id: handle.id,
          open: true,
          title: "Extracting data via OCR…",
          description: (
            <span className="flex items-center gap-2 text-sm">
              <Brain
                className="size-4 shrink-0 text-violet-600 dark:text-violet-400"
                aria-hidden
              />
              Reading tables and line items from your upload.
            </span>
          ),
        });
      }, STEP_MS);

      window.setTimeout(() => {
        handle.update({
          id: handle.id,
          open: true,
          title: "Categorizing…",
          description: (
            <span className="flex items-center gap-2 text-sm">
              <Zap
                className="size-4 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden
              />
              Mapping transactions to your chart of accounts.
            </span>
          ),
        });
      }, STEP_MS * 2);

      window.setTimeout(() => {
        handle.update({
          id: handle.id,
          open: true,
          title: `Done! ${n} document${n === 1 ? "" : "s"} processed.`,
          description: (
            <span className="flex items-center gap-2 text-sm">
              <CheckCircle2
                className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden
              />
              You can close this notification or continue working.
            </span>
          ),
        });
      }, STEP_MS * 3);

      e.target.value = "";
    },
    [toast]
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.pdf,.png,application/pdf,image/png,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        multiple
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={onFilesSelected}
      />
      <motion.button
        type="button"
        onClick={openPicker}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
        className={cn(
          "group relative inline-flex h-9 shrink-0 items-center gap-2 overflow-hidden rounded-lg border border-violet-200/80 bg-white px-3 text-sm font-semibold tracking-tight text-foreground shadow-sm",
          "ring-1 ring-transparent transition-shadow duration-200",
          "hover:border-teal-300/70 hover:shadow-[0_0_0_1px_rgba(45,212,191,0.25),0_4px_24px_-4px_rgba(139,92,246,0.2),0_8px_32px_-8px_rgba(45,212,191,0.15)]",
          "focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
          "dark:border-violet-800/60 dark:bg-background dark:hover:border-teal-700/50"
        )}
      >
        <span
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-teal-500/8 via-violet-500/10 to-teal-500/8 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          aria-hidden
        />
        <UploadCloud
          className="relative z-10 size-4 shrink-0 text-[var(--brand-primary)]"
          aria-hidden
        />
        <span className="relative z-10">Import Data</span>
      </motion.button>
    </>
  );
}
