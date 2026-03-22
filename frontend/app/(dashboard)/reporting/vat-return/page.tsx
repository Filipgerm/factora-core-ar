import { FileCheck } from "lucide-react";

export default function VatReturnPage() {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200/90 bg-white p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-background lg:p-10">
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-teal-200/50 bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)] dark:border-teal-800/50 dark:bg-teal-950/30">
          <FileCheck className="size-6" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            VAT return
          </h1>
          <p className="mt-3 text-base leading-relaxed tracking-tight text-muted-foreground">
            VAT return for Q1 2025 — ready to review.
          </p>
        </div>
      </div>
    </div>
  );
}
