"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Partner } from "@/lib/data/buyer-partners";
import { Share2 } from "lucide-react";

type ShareProfileButtonProps = {
  banks: Partner[];
  insuranceCompanies: Partner[];
  loading?: boolean;
};

export function ShareProfileButton({
  banks,
  insuranceCompanies,
  loading = false,
}: ShareProfileButtonProps) {
  const { toast } = useToast();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [companyType, setCompanyType] = useState<"insurance" | "bank" | null>(null);

  const resetSelection = () => {
    setSelectedCompany(null);
    setCompanyType(null);
  };

  const handleConfirm = () => {
    if (!selectedCompany || !companyType) return;
    const company =
      companyType === "insurance"
        ? insuranceCompanies.find((item) => item.id === selectedCompany)
        : banks.find((item) => item.id === selectedCompany);

    const companyName = company?.name || "";
    if (!companyName) return;

    setConfirmDialogOpen(false);
    setShareDialogOpen(false);
    toast({
      title: "Profile Shared",
      description: `Your profile has been shared with ${companyName}.`,
    });
    resetSelection();
  };

  if (loading) {
    return <div className="h-10 w-32 bg-muted animate-pulse rounded-md" />;
  }

  return (
    <>
      {/* HIGHLIGHTED BUTTON INSTEAD OF CARD */}
      <Button
        onClick={() => setShareDialogOpen(true)}
        className="bg-brand-primary hover:bg-brand-primary-hover text-white shadow-md transition-all"
      >
        <Share2 className="w-4 h-4 mr-2" />
        Share Profile
      </Button>

      <Dialog
        open={shareDialogOpen}
        onOpenChange={(open) => {
          setShareDialogOpen(open);
          if (!open) resetSelection();
        }}
      >
        <DialogContent className="dashboard-theme p-0 max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="px-8 pt-8 pb-6 space-y-3 sm:space-y-4 flex-shrink-0">
            <DialogTitle className="text-xl sm:text-2xl">Share Your Profile</DialogTitle>
            <DialogDescription className="text-base leading-7">
              Select an insurance company or bank to share your business profile with.
            </DialogDescription>
          </DialogHeader>

          <div className="px-8 pb-6 overflow-y-auto flex-1 min-h-0">
            <div className="grid grid-cols-3 gap-4">
              {insuranceCompanies.map((company) => (
                <div
                  key={company.id}
                  onClick={() => {
                    setSelectedCompany(company.id);
                    setCompanyType("insurance");
                  }}
                  className={`border-2 rounded-lg p-3 bg-card hover:shadow-lg transition-all duration-300 cursor-pointer flex items-center justify-center aspect-square ${selectedCompany === company.id && companyType === "insurance"
                    ? "border-brand-primary ring-2 ring-brand-primary ring-opacity-50"
                    : "border-border"
                    }`}
                >
                  <div className="flex justify-center items-center w-full h-full">
                    <img
                      src={company.logo}
                      alt={`${company.name} logo`}
                      className="w-auto h-auto object-contain max-w-full max-h-full"
                    />
                  </div>
                </div>
              ))}
              {banks.map((bank) => (
                <div
                  key={bank.id}
                  onClick={() => {
                    setSelectedCompany(bank.id);
                    setCompanyType("bank");
                  }}
                  className={`border-2 rounded-lg p-3 bg-card hover:shadow-lg transition-all duration-300 cursor-pointer flex items-center justify-center aspect-square ${selectedCompany === bank.id && companyType === "bank"
                    ? "border-brand-primary ring-2 ring-brand-primary ring-opacity-50"
                    : "border-border"
                    }`}
                >
                  <div className="flex justify-center items-center w-full h-full">
                    <img
                      src={bank.logo}
                      alt={`${bank.name} logo`}
                      className="w-auto h-auto object-contain max-w-full max-h-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="px-8 pb-8 pt-4 gap-3 border-t flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setShareDialogOpen(false);
                resetSelection();
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!selectedCompany || !companyType}
              onClick={() => {
                if (selectedCompany && companyType) {
                  setConfirmDialogOpen(true);
                }
              }}
              className="bg-gradient-to-r from-brand-primary to-brand-grad-start hover:from-brand-primary-hover hover:to-brand-grad-start text-white"
            >
              Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Profile Sharing</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCompany && companyType ? (
                <>
                  You will be sharing your profile and important information with{" "}
                  <strong>
                    {companyType === "insurance"
                      ? insuranceCompanies.find((c) => c.id === selectedCompany)?.name
                      : banks.find((b) => b.id === selectedCompany)?.name}
                  </strong>
                  . Are you sure you want to proceed?
                </>
              ) : (
                "Are you sure you want to proceed?"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-gradient-to-r from-brand-primary to-brand-grad-start hover:from-brand-primary-hover hover:to-brand-grad-start text-white"
            >
              Yes, Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

