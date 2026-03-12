"use client";

import { useRouter } from "next/navigation";
import { Receipt, Building2, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Invoice } from "@/lib/invoices/invoice-types";
import invoiceConfig from "@/lib/data/invoice-config.json";
import businessByVatData from "@/lib/data/business-by-vat.json";

const statusColors = invoiceConfig.statusColors as Record<
  Invoice["status"],
  string
>;

const businessByVat = businessByVatData as Record<
  string,
  {
    name: string;
    addressLines: string[];
    email: string;
    phone: string;
  }
>;

interface InvoiceDetailSheetProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceDetailSheet({
  invoice,
  isOpen,
  onOpenChange,
}: InvoiceDetailSheetProps) {
  const router = useRouter();

  if (!invoice) return null;

  const handleEditDraft = () => {
    try {
      sessionStorage.setItem("factora:editingDraftId", invoice.id);
    } catch (_) { }
    router.push("/ai-copilot/finance-invoices");
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 overflow-y-auto"
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-200 bg-gradient-to-r from-brand-grad-start/5 to-brand-primary/5">
            <SheetHeader>
              <div className="flex items-center gap-2 text-foreground">
                <Receipt className="h-5 w-5 text-brand-grad-start" />
                <SheetTitle className="text-xl">{`Invoice ${invoice.id}`}</SheetTitle>
              </div>
              <SheetDescription className="text-brand-grad-start">{`Created on ${invoice.created}`}</SheetDescription>
            </SheetHeader>
          </div>

          {/* Amount & Status */}
          <div className="px-6">
            <Card className="border-slate-200 shadow-none">
              <CardContent className="p-5 flex items-start justify-between">
                <div>
                  <div className="text-sm text-slate-500 mb-1">Amount</div>
                  <div className="text-3xl font-bold text-foreground">
                    {invoice.amount}
                  </div>
                  {invoice.customerVat && (
                    <div className="text-xs text-slate-500 mt-2">{`VAT: ${invoice.customerVat}`}</div>
                  )}
                  <div className="text-xs text-slate-500 mt-1">
                    {invoice.status === "Paid" && "Paid on Feb 12, 2025"}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`${statusColors[invoice.status]} font-medium`}
                >
                  {invoice.status}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Business */}
          <div className="px-6">
            <div className="text-sm font-semibold text-foreground mb-2">
              Business
            </div>
            <Card className="border-slate-200 shadow-none">
              <CardContent className="p-5 text-sm text-brand-grad-start space-y-4">
                {invoice.status === "Draft" && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <Building2 className="h-4 w-4 text-brand-grad-start" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          {invoice.businessName || "Draft business"}
                        </div>
                        {(invoice.businessAddressLines || []).map((l, i) => (
                          <div key={i}>{l}</div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-brand-grad-start" />
                      {invoice.businessEmail ? (
                        <a
                          href={`mailto:${invoice.businessEmail}`}
                          className="text-brand-primary hover:underline"
                        >
                          {invoice.businessEmail}
                        </a>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-brand-grad-start" />
                      {invoice.businessPhone ? (
                        <a
                          href={`tel:${invoice.businessPhone.replace(
                            /[^+\d]/g,
                            ""
                          )}`}
                          className="text-brand-primary hover:underline"
                        >
                          {invoice.businessPhone}
                        </a>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </div>
                  </div>
                )}
                {invoice.status !== "Draft" &&
                  (businessByVat[invoice.vat || ""] ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <Building2 className="h-4 w-4 text-brand-grad-start" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">
                            {businessByVat[invoice.vat!].name}
                          </div>
                          {businessByVat[invoice.vat!].addressLines.map(
                            (l, i) => (
                              <div key={i}>{l}</div>
                            )
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-brand-grad-start" />
                        <a
                          href={`mailto:${businessByVat[invoice.vat!].email}`}
                          className="text-brand-primary hover:underline"
                        >
                          {businessByVat[invoice.vat!].email}
                        </a>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-brand-grad-start" />
                        <a
                          href={`tel:${businessByVat[invoice.vat!].phone.replace(
                            /[^+\d]/g,
                            ""
                          )}`}
                          className="text-brand-primary hover:underline"
                        >
                          {businessByVat[invoice.vat!].phone}
                        </a>
                      </div>
                    </div>
                  ) : invoice.businessName ||
                    (invoice.businessAddressLines &&
                      invoice.businessAddressLines.length > 0) ||
                    invoice.businessEmail ||
                    invoice.businessPhone ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <Building2 className="h-4 w-4 text-brand-grad-start" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">
                            {invoice.businessName || ""}
                          </div>
                          {(invoice.businessAddressLines || []).map((l, i) => (
                            <div key={i}>{l}</div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-brand-grad-start" />
                        {invoice.businessEmail ? (
                          <a
                            href={`mailto:${invoice.businessEmail}`}
                            className="text-brand-primary hover:underline"
                          >
                            {invoice.businessEmail}
                          </a>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-brand-grad-start" />
                        {invoice.businessPhone ? (
                          <a
                            href={`tel:${invoice.businessPhone.replace(
                              /[^+\d]/g,
                              ""
                            )}`}
                            className="text-brand-primary hover:underline"
                          >
                            {invoice.businessPhone}
                          </a>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </div>
                    </div>
                  ) : null)}
              </CardContent>
            </Card>
          </div>

          {invoice.status === "Draft" && (
            <div className="px-6">
              <Button
                onClick={handleEditDraft}
                className="bg-gradient-to-r from-brand-primary to-brand-grad-start hover:from-brand-primary-hover hover:to-brand-grad-start text-white"
              >
                Edit draft
              </Button>
            </div>
          )}

          <div className="h-4" />
        </div>
      </SheetContent>
    </Sheet>
  );
}

