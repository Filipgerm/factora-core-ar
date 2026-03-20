"use client";

import { useState, useCallback } from "react";
import {
  Mail,
  Sheet as SheetIcon,
  Landmark,
  FileCheck,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MOCK_INTEGRATION_SERVICES } from "@/lib/data/mock-integrations";
import { cn } from "@/lib/utils";

const ICON_MAP = {
  Mail,
  Sheet: SheetIcon,
  Landmark,
  FileCheck,
  Building2,
} as const;

export default function IntegrationsPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const hasCsvXlsx = files.some(
      (f) =>
        f.name.endsWith(".csv") ||
        f.name.endsWith(".xlsx") ||
        f.name.endsWith(".xls")
    );
    if (hasCsvXlsx) {
      simulateParsing();
    }
  }, []);

  const simulateParsing = () => {
    setIsParsing(true);
    setParseProgress(0);
    const interval = setInterval(() => {
      setParseProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsParsing(false), 500);
          return 100;
        }
        return p + 10;
      });
    }, 150);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length && (files[0].name.endsWith(".csv") || files[0].name.endsWith(".xlsx") || files[0].name.endsWith(".xls"))) {
      simulateParsing();
    }
    e.target.value = "";
  };

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-slate-900">
            Data Ingestion & Integrations
          </h1>
          <p className="text-sm text-slate-500">
            Connect services and upload files to sync your financial data.
          </p>
        </div>

        {/* Connected Services Grid */}
        <div>
          <h2 className="text-sm font-medium text-slate-700 mb-4">
            Connected Services
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {MOCK_INTEGRATION_SERVICES.map((service) => {
              const Icon = ICON_MAP[service.icon as keyof typeof ICON_MAP] ?? Building2;
              return (
                <Card
                  key={service.id}
                  className={cn(
                    "border-slate-200 rounded-xl transition-all duration-200",
                    "hover:shadow-md hover:border-slate-300"
                  )}
                >
                  <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{service.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {service.description}
                      </p>
                    </div>
                    {service.connected ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <Badge variant="secondary" className="text-xs">
                          Connected
                        </Badge>
                        {service.lastSync && (
                          <span className="text-xs text-slate-400">
                            {service.lastSync}
                          </span>
                        )}
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" className="w-full">
                        Connect
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Manual Ingestion Dropzone */}
        <div>
          <h2 className="text-sm font-medium text-slate-700 mb-4">
            Manual Ingestion
          </h2>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative border-2 border-dashed rounded-xl p-12 transition-all duration-200",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-slate-200 bg-white hover:border-slate-300",
              isParsing && "pointer-events-none"
            )}
          >
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {isParsing ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-sm font-medium text-slate-700">
                  Parsing file...
                </p>
                <div className="w-full max-w-xs h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-200"
                    style={{ width: `${parseProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <FileSpreadsheet className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">
                    Upload your first CSV or XLSX
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Drag and drop bank statements or ERP records, or click to
                    browse
                  </p>
                </div>
                <Button variant="outline" size="sm" className="mt-2">
                  Browse files
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
