"use client";

import { useCallback, useRef, useState } from "react";
import { Receipt, Upload } from "lucide-react";

import { FeatureEmptyState } from "@/components/features/common/feature-empty-state";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { isApiError } from "@/lib/api/types";
import { useUploadBillMutation } from "@/lib/hooks/api/use-files";
import { cn } from "@/lib/utils";

export function ApBillsView() {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const upload = useUploadBillMutation();

  const runUpload = useCallback(
    (file: File) => {
      const { dismiss } = toast({
        title: "Uploading bill…",
        description: "We are storing your file securely.",
      });
      upload.mutate(file, {
        onSuccess: (r) => {
          dismiss();
          toast({
            title: "Bill uploaded",
            description: `${r.original_name} — extraction will run when the AP pipeline is connected.`,
          });
        },
        onError: (e) => {
          dismiss();
          toast({
            variant: "destructive",
            title: "Upload failed",
            description: isApiError(e) ? e.message : "Could not upload file",
          });
        },
      });
    },
    [toast, upload]
  );

  return (
    <div className="space-y-6">
      <FeatureEmptyState
        icon={Receipt}
        title="Bills inbox"
        description="Drop a PDF or image of a vendor bill to upload it to your organization. Parsed line items will appear here when the AP ingestion service is connected."
        ctaHref="/accounts-payable/vendors"
        ctaLabel="View vendors"
      />

      <div
        role="presentation"
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOver(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) runUpload(f);
        }}
        className={cn(
          "rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/40 px-6 py-10 text-center shadow-sm transition-all duration-200 dark:border-slate-700 dark:bg-slate-950/30",
          dragOver && "border-primary/40 bg-primary/[0.04] ring-2 ring-primary/15"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept="application/pdf,image/*,.pdf,.png,.jpg,.jpeg,.webp"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) runUpload(f);
            e.target.value = "";
          }}
        />
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          <Upload className="size-6" strokeWidth={1.5} aria-hidden />
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">
          Drag and drop a bill
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          PDF or image · max size depends on your reverse proxy
        </p>
        <Button
          type="button"
          className="mt-5 rounded-xl transition-all duration-200"
          disabled={upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
          {upload.isPending ? "Uploading…" : "Upload bill"}
        </Button>
      </div>
    </div>
  );
}
