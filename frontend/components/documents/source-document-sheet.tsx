"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type SourceDocField = {
  key: string;
  label: string;
  value: string;
};

export function SourceDocumentSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  fields,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  fields: SourceDocField[];
}) {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const m: Record<string, string> = {};
    for (const f of fields) m[f.key] = f.value;
    setValues(m);
  }, [fields, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 border-l border-slate-200 p-0 sm:max-w-[min(96vw,56rem)] dark:border-slate-800"
      >
        <SheetHeader className="border-b border-slate-100 px-6 py-5 text-left dark:border-slate-800">
          <SheetTitle className="text-lg font-semibold tracking-tight">
            {title}
          </SheetTitle>
          {subtitle ? (
            <SheetDescription className="text-xs tracking-tight">
              {subtitle}
            </SheetDescription>
          ) : null}
        </SheetHeader>
        <div className="grid min-h-0 flex-1 md:grid-cols-2">
          <div className="min-h-0 space-y-4 overflow-y-auto border-b border-slate-100 p-6 md:border-b-0 md:border-r dark:border-slate-800">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Extracted fields
            </p>
            <div className="space-y-3">
              {fields.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label
                    htmlFor={`src-${f.key}`}
                    className="text-xs font-medium text-muted-foreground"
                  >
                    {f.label}
                  </Label>
                  <Input
                    id={`src-${f.key}`}
                    value={values[f.key] ?? ""}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [f.key]: e.target.value }))
                    }
                    className="h-9 text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="button" size="sm" className="rounded-lg">
                Save draft
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-lg"
              >
                Discard
              </Button>
            </div>
          </div>
          <div className="flex min-h-[200px] flex-col bg-slate-50/80 p-4 dark:bg-slate-900/40 md:min-h-0">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Source document
            </p>
            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-950/50"
              )}
            >
              <p className="text-sm font-medium text-foreground">
                PDF / image preview
              </p>
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
                Original invoice or receipt renders here (placeholder). Connect
                document storage to embed the viewer.
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
