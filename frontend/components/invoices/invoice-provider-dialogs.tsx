"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { banks, Bank } from "@/components/new-bank-integration-content";
import insuranceCompaniesData from "@/lib/data/insurance-companies.json";
import { storeCreditLimitRequest } from "@/lib/credit-limit-requests";
import { Invoice } from "@/lib/invoices/invoice-types";
import { CURRENCY_SYMBOL } from "@/lib/config/invoice-constants";
import { getBusinessName } from "@/lib/invoices/invoice-helpers";

type InsuranceCompany = {
  id: string;
  name: string;
  logo: string;
};

const insuranceCompanies = insuranceCompaniesData as InsuranceCompany[];

interface InvoiceProviderDialogsProps {
  creditLimitReady: boolean;
  selectedInvoiceIds: string[];
  selectedInvoices: Invoice[];
  totalAmount: number;
  vatNumber?: string;
  showCreditLimit?: boolean;
  allInvoices: Invoice[];
  onRequestSubmitted: () => void;
}

export function InvoiceProviderDialogs({
  creditLimitReady,
  selectedInvoiceIds,
  selectedInvoices,
  totalAmount,
  vatNumber,
  showCreditLimit = true,
  allInvoices,
  onRequestSubmitted,
}: InvoiceProviderDialogsProps) {
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [insuranceDialogOpen, setInsuranceDialogOpen] = useState(false);
  const [selectedInsuranceCompany, setSelectedInsuranceCompany] = useState<
    string | null
  >(null);
  const [onboardingDialogOpen, setOnboardingDialogOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleBankSubmit = () => {
    if (!selectedBank || !vatNumber || selectedInvoices.length === 0) return;

    const selectedBankData = banks.find((b) => b.id === selectedBank);
    if (!selectedBankData) return;

    try {
      storeCreditLimitRequest({
        vatNumber,
        businessName: getBusinessName(vatNumber, allInvoices),
        requestType: "credit limit",
        invoiceCount: selectedInvoices.length,
        totalAmount,
        invoiceIds: selectedInvoiceIds,
        providerName: selectedBankData.name,
      });

      setBankDialogOpen(false);
      toast({
        title: "Payment Request Submitted",
        description: `Your payment request for ${selectedBankData.name} is pending and will be updated once confirmed.`,
      });
      setSelectedBank(null);
      onRequestSubmitted();
    } catch (error) {
      console.error("Failed to store financing request:", error);
      toast({
        title: "Error",
        description: "Failed to submit payment request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleInsuranceSubmit = () => {
    if (
      !selectedInsuranceCompany ||
      !vatNumber ||
      selectedInvoices.length === 0
    )
      return;

    const selectedCompany = insuranceCompanies.find(
      (c) => c.id === selectedInsuranceCompany
    );
    if (!selectedCompany) return;

    try {
      storeCreditLimitRequest({
        vatNumber,
        businessName: getBusinessName(vatNumber, allInvoices),
        requestType: "insurance",
        invoiceCount: selectedInvoices.length,
        totalAmount,
        invoiceIds: selectedInvoiceIds,
        providerName: selectedCompany.name,
      });

      setInsuranceDialogOpen(false);
      toast({
        title: "Insurance Request Submitted",
        description: `Your insurance request for ${selectedCompany.name} is pending and will be updated once confirmed.`,
      });
      setSelectedInsuranceCompany(null);
      onRequestSubmitted();
    } catch (error) {
      console.error("Failed to store insurance request:", error);
      toast({
        title: "Error",
        description: "Failed to submit insurance request. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center gap-4">
      {creditLimitReady ? (
        <>
          <Dialog
            open={bankDialogOpen}
            onOpenChange={(open) => {
              setBankDialogOpen(open);
              if (!open) {
                setSelectedBank(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                size="lg"
                disabled={selectedInvoiceIds.length === 0}
                className={`cta-button bg-gradient-to-r from-brand-primary to-brand-grad-start hover:from-brand-primary-hover hover:to-brand-grad-start text-white px-12 py-8 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 ${selectedInvoiceIds.length === 0
                  ? "opacity-60 cursor-not-allowed"
                  : ""
                  }`}
              >
                {showCreditLimit ? "Get paid now" : "Finance"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="p-0 max-w-4xl max-h-[90vh] flex flex-col">
              <DialogHeader className="px-8 pt-8 pb-6 space-y-3 sm:space-y-4 flex-shrink-0">
                <DialogTitle className="text-xl sm:text-2xl">
                  Select Bank
                </DialogTitle>
                <DialogDescription className="text-base leading-7">
                  Choose a bank to process your payment.
                </DialogDescription>
              </DialogHeader>

              <div className="px-8 pb-6 overflow-y-auto flex-1 min-h-0">
                <div className="flex justify-start gap-3 mb-6 flex-wrap">
                  {banks.map((bank) => {
                    const isSvg = bank.logo.toLowerCase().endsWith(".svg");
                    return (
                      <div
                        key={bank.id}
                        onClick={() => setSelectedBank(bank.id)}
                        className={`w-18 h-18 border-2 rounded-lg p-1 bg-card hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col items-center justify-center ${selectedBank === bank.id
                          ? "border-brand-primary ring-2 ring-brand-primary ring-opacity-50"
                          : "border-border"
                          }`}
                        style={{ width: "72px", height: "72px" }}
                      >
                        <div className="flex-shrink-0 mb-1 flex justify-center flex-1 items-center w-full">
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{
                              maxWidth: "60px",
                              maxHeight: "32px",
                              padding: "0 2px",
                            }}
                          >
                            {isSvg ? (
                              <img
                                src={bank.logo}
                                alt={`${bank.name} logo`}
                                className="w-auto h-auto"
                                style={{
                                  maxWidth: "60px",
                                  maxHeight: "32px",
                                  width: "auto",
                                  height: "auto",
                                  objectFit: "contain",
                                }}
                              />
                            ) : (
                              <Image
                                src={bank.logo}
                                alt={`${bank.name} logo`}
                                width={68}
                                height={38}
                                className="w-auto h-auto object-contain"
                                style={{
                                  maxWidth: "60px",
                                  maxHeight: "32px",
                                }}
                              />
                            )}
                          </div>
                        </div>
                        <h3 className="text-[10px] font-bold text-card-foreground text-center leading-tight px-0.5 line-clamp-2">
                          {bank.name}
                        </h3>
                      </div>
                    );
                  })}
                </div>

                {selectedInvoices.length > 0 && (
                  <div className="border border-border rounded-lg p-6 bg-slate-50">
                    <h3 className="text-lg font-semibold text-card-foreground mb-4">
                      Selected Invoices ({selectedInvoices.length})
                    </h3>
                    <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto">
                      {selectedInvoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="flex items-center justify-between py-2 border-b border-slate-200 last:border-b-0"
                        >
                          <span className="text-sm font-medium text-card-foreground">
                            {invoice.id}
                          </span>
                          <span className="text-sm font-semibold text-card-foreground">
                            {invoice.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-300">
                      <span className="text-base font-semibold text-card-foreground">
                        Total Amount
                      </span>
                      <span className="text-xl font-bold text-brand-grad-start">
                        {CURRENCY_SYMBOL}
                        {totalAmount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="px-8 pb-8 pt-4 gap-3 border-t flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setBankDialogOpen(false);
                    setSelectedBank(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  disabled={!selectedBank}
                  onClick={handleBankSubmit}
                  className="bg-gradient-to-r from-brand-primary to-brand-grad-start hover:from-brand-primary-hover hover:to-brand-grad-start text-white"
                >
                  Proceed
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={insuranceDialogOpen}
            onOpenChange={(open) => {
              setInsuranceDialogOpen(open);
              if (!open) {
                setSelectedInsuranceCompany(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                size="lg"
                disabled={selectedInvoiceIds.length === 0}
                className={`cta-button bg-gradient-to-r from-brand-primary to-brand-grad-start hover:from-brand-primary-hover hover:to-brand-grad-start text-white px-12 py-8 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 ${selectedInvoiceIds.length === 0
                  ? "opacity-60 cursor-not-allowed"
                  : ""
                  }`}
              >
                Get Insured Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="p-0 max-w-4xl max-h-[90vh] flex flex-col">
              <DialogHeader className="px-8 pt-8 pb-6 space-y-3 sm:space-y-4 flex-shrink-0">
                <DialogTitle className="text-xl sm:text-2xl">
                  Select Insurance Company
                </DialogTitle>
                <DialogDescription className="text-base leading-7">
                  Choose an insurance company to send your selected invoices
                  for coverage.
                </DialogDescription>
              </DialogHeader>

              <div className="px-8 pb-6 overflow-y-auto flex-1 min-h-0">
                <div className="flex justify-start gap-3 mb-6 flex-wrap">
                  {insuranceCompanies.map((company) => (
                    <div
                      key={company.id}
                      onClick={() => setSelectedInsuranceCompany(company.id)}
                      className={`w-18 h-18 border-2 rounded-lg p-1.5 bg-card hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col items-center justify-center ${selectedInsuranceCompany === company.id
                        ? "border-brand-primary ring-2 ring-brand-primary ring-opacity-50"
                        : "border-border"
                        }`}
                      style={{ width: "72px", height: "72px" }}
                    >
                      <div className="flex-shrink-0 mb-0.5 flex justify-center flex-1 items-center">
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ maxWidth: "54px", maxHeight: "30px" }}
                        >
                          <Image
                            src={company.logo}
                            alt={`${company.name} logo`}
                            width={68}
                            height={38}
                            className="w-auto h-auto object-contain"
                            style={{ maxWidth: "54px", maxHeight: "30px" }}
                          />
                        </div>
                      </div>
                      <h3 className="text-[10px] font-bold text-card-foreground text-center leading-tight px-0.5">
                        {company.name}
                      </h3>
                    </div>
                  ))}
                </div>

                {selectedInvoices.length > 0 && (
                  <div className="border border-border rounded-lg p-6 bg-slate-50">
                    <h3 className="text-lg font-semibold text-card-foreground mb-4">
                      Selected Invoices ({selectedInvoices.length})
                    </h3>
                    <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto">
                      {selectedInvoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="flex items-center justify-between py-2 border-b border-slate-200 last:border-b-0"
                        >
                          <span className="text-sm font-medium text-card-foreground">
                            {invoice.id}
                          </span>
                          <span className="text-sm font-semibold text-card-foreground">
                            {invoice.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-300">
                      <span className="text-base font-semibold text-card-foreground">
                        Total Amount
                      </span>
                      <span className="text-xl font-bold text-brand-grad-start">
                        {CURRENCY_SYMBOL}
                        {totalAmount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="px-8 pb-8 pt-4 gap-3 border-t flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setInsuranceDialogOpen(false);
                    setSelectedInsuranceCompany(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  disabled={!selectedInsuranceCompany}
                  onClick={handleInsuranceSubmit}
                  className="bg-gradient-to-r from-brand-primary to-brand-grad-start hover:from-brand-primary-hover hover:to-brand-grad-start text-white"
                >
                  Proceed
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <Dialog open={onboardingDialogOpen} onOpenChange={setOnboardingDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="cta-button cursor-not-allowed bg-gray-300 text-white px-12 py-8 rounded-xl font-semibold text-lg shadow-lg transition-all duration-200"
            >
              {showCreditLimit ? "Get paid now" : "Pay Now"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="p-8 sm:p-10">
            <DialogHeader className="space-y-3 sm:space-y-4">
              <DialogTitle className="text-xl sm:text-2xl">
                Complete your business onboarding
              </DialogTitle>
              <DialogDescription className="text-base leading-7">
                In order to get access to invoice financing you have to complete
                your business onboarding (the steps involve adding the UBOs of
                your business and completing a KYC verification process).
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-2 sm:mt-4 gap-3">
              <Button
                variant="outline"
                onClick={() => setOnboardingDialogOpen(false)}
              >
                Maybe later
              </Button>
              <Button
                onClick={() => {
                  setOnboardingDialogOpen(false);
                  router.push("/onboarding/shareholders");
                  window.location.href = "/onboarding/shareholders";
                }}
                className="bg-brand-primary hover:bg-brand-primary-hover text-white"
              >
                I want to get financed
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

