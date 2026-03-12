"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Sensitive } from "@/components/ui/sensitive";
import { InvoiceProviderDialogs } from "./invoice-provider-dialogs";
import { Invoice } from "@/lib/invoices/invoice-types";
import { CREDIT_LIMIT_EUR, CURRENCY_SYMBOL } from "@/lib/config/invoice-constants";

interface InvoiceCTASectionProps {
  creditLimitReady: boolean;
  selectedInvoiceIds: string[];
  selectedInvoices: Invoice[];
  totalAmount: number;
  vatNumber?: string;
  showCreditLimit?: boolean;
  allInvoices: Invoice[];
  onRequestSubmitted: () => void;
}

export function InvoiceCTASection({
  creditLimitReady,
  selectedInvoiceIds,
  selectedInvoices,
  totalAmount,
  vatNumber,
  showCreditLimit = true,
  allInvoices,
  onRequestSubmitted,
}: InvoiceCTASectionProps) {
  return (
    <div className="cta-section flex items-center justify-between gap-4">
      <InvoiceProviderDialogs
        creditLimitReady={creditLimitReady}
        selectedInvoiceIds={selectedInvoiceIds}
        selectedInvoices={selectedInvoices}
        totalAmount={totalAmount}
        vatNumber={vatNumber}
        showCreditLimit={showCreditLimit}
        allInvoices={allInvoices}
        onRequestSubmitted={onRequestSubmitted}
      />

      {showCreditLimit && (
        <Card className="available-card bg-gradient-to-br from-brand-primary to-brand-grad-start text-white border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="text-right">
              {creditLimitReady ? (
                <>
                  <div className="text-2xl font-bold">
                    <Sensitive>
                      {`${CURRENCY_SYMBOL}${CREDIT_LIMIT_EUR.toLocaleString()}`}
                    </Sensitive>{" "}
                    Available
                  </div>
                  <div className="text-sm opacity-90">
                    <Sensitive>
                      {`${CURRENCY_SYMBOL}${CREDIT_LIMIT_EUR.toLocaleString()}`}
                    </Sensitive>{" "}
                    Credit Limit Approved
                  </div>
                </>
              ) : (
                <div className="text-2xl font-bold">Credit Limit Not Set</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

