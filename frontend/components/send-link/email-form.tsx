"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { LayoutTemplate, Building2, Landmark, FileSpreadsheet, UserCheck, Loader2, Send, Settings, ChevronDown, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { EmailTemplate } from "@/lib/email-templates";
import { isEmailContentEmpty, ONBOARDING_LINK } from "@/lib/send-link";
import { InteractiveEmailLaptop } from "./email-preview";
import { EmailStatusMessages } from "./email-status-messages";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const CONFIG_MODULES = [
  {
    id: "company_info",
    label: "Detailed Business Information",
    description: "Industry, Annual Revenue, Number of Employees, Website",
    icon: Building2,
    imagePath: "/images/onboarding_preview/business_information_step.png"
  },
  {
    id: "bank_connection",
    label: "Bank Connection",
    description: "Secure open banking link for cash flow analysis.",
    icon: Landmark,
    imagePath: "/images/onboarding_preview/banks_step.png"
  },
  {
    id: "job_sheet",
    label: "Job Details",
    description: "Projected job sheets and service descriptions.",
    icon: FileText,
    imagePath: "/images/onboarding_preview/job_sheet.png"
  },
  {
    id: "signatory",
    label: "Shareholders",
    description: "UBO declarations.",
    icon: UserCheck,
    imagePath: "/images/onboarding_preview/shareholders_step.png"
  },
  {
    id: "trade_references",
    label: "Trade References",
    description: "Business Partner References.",
    icon: FileSpreadsheet,
    imagePath: "/images/onboarding_preview/trade_references_step.png"
  },
  // {
  //   id: "accounting",
  //   label: "Accounting",
  //   description: "myDATA or ERP connection for recent financials.",
  //   icon: FileSpreadsheet,
  //   imagePath: "/images/onboarding_preview/accounting_step.png"
  // },
];

interface EmailFormProps {
  templates: EmailTemplate[];
  loading?: boolean;
  onSendEmail: (email: string, subject: string, content: string, customOnboardingUrl: string) => Promise<void>;
}

export function EmailForm({
  templates,
  loading = false,
  onSendEmail,
}: EmailFormProps) {
  const router = useRouter();

  // State for the inputs
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [customEmailMessage, setCustomEmailMessage] = useState("");
  const [viewMode, setViewMode] = useState<"compose" | "preview">("compose");
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  const [emailSentSuccess, setEmailSentSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- CONFIGURATION ENGINE STATES ---
  const [configOpen, setConfigOpen] = useState(false);
  const [excludedModules, setExcludedModules] = useState<string[]>([]);
  const [previewModule, setPreviewModule] = useState<string>("company_info");

  const toggleModule = (moduleId: string) => {
    setExcludedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };
  const includedCount = CONFIG_MODULES.length - excludedModules.length;

  const handleInsertTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);

    if (template) {
      if (template.subject) {
        setEmailSubject(template.subject);
      }
      if (template.htmlContent) {
        setCustomEmailMessage(template.htmlContent);
      }
      setViewMode("preview");
      setActiveTemplateId(templateId);
    }
  };

  const handleManualContentChange = (content: string) => {
    setCustomEmailMessage(content);
    if (activeTemplateId) setActiveTemplateId(null);
  };

  const handleSendEmail = async () => {
    setError(null);
    setEmailSentSuccess(false);

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!recipientEmail || !emailRegex.test(recipientEmail)) {
      setError("Please enter a valid recipient email address.");
      return;
    }

    if (!emailSubject.trim()) {
      setError("Please enter an email subject.");
      return;
    }

    if (isEmailContentEmpty(customEmailMessage)) {
      setError("Please write a message content.");
      return;
    }

    // Generate the custom URL with excluded parameters
    const excludeQuery = excludedModules.length > 0 ? `?exclude=${excludedModules.join(",")}` : "";
    const customOnboardingUrl = `${ONBOARDING_LINK}${excludeQuery}`;

    try {
      await onSendEmail(recipientEmail, emailSubject, customEmailMessage, customOnboardingUrl);
      setEmailSentSuccess(true);
    } catch (err) {
      console.error(err);
      setError("Failed to send email. Please try again.");
    }
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardContent className="p-0">
        <div className="flex flex-col xl:flex-row gap-8">

          {/* LEFT COLUMN: Controls & Form */}
          <div className="w-full xl:w-[380px] shrink-0 space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Email Campaign</h3>
                <p className="text-sm text-gray-500">
                  Configure your verification link and email content.
                </p>
              </div>

              {/* Recipient & Subject Form */}
              <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex-shrink-0">

                {/* Template Controls Header */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-900">Email Details</h4>
                  <div className="flex items-center gap-1.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs">
                          <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-brand-primary" />
                          Choose template
                          <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        {templates.map((t) => (
                          <DropdownMenuItem key={t.id} onClick={() => handleInsertTemplate(t.id)}>
                            {t.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-gray-500 hover:text-gray-900"
                      onClick={() => router.push("/send-link/templates?tab=email")}
                      title="Manage Templates"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="recipient-email" className="text-xs font-semibold text-gray-700">Recipient Email *</Label>
                    <Input
                      id="recipient-email"
                      type="email"
                      placeholder="client@company.com"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      className="bg-gray-50/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email-subject" className="text-xs font-semibold text-gray-700">Subject *</Label>
                    <Input
                      id="email-subject"
                      type="text"
                      placeholder="Invitation..."
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="bg-gray-50/50"
                    />
                  </div>
                </div>
              </section>

              {/* --- ONBOARDING CONFIGURATION WIDGET --- */}
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4 text-brand-primary" />
                    Onboarding Flow
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {includedCount} of {CONFIG_MODULES.length} optional steps selected.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => { e.preventDefault(); setConfigOpen(true); }}
                  className="bg-white text-gray-700 border-gray-200 shadow-sm hover:border-brand-primary-hover hover:text-brand-primary-hover hover:bg-brand-primary-subtle/20 hover:shadow-md hover:shadow-brand-primary/10 transition-all duration-300 font-medium"                >
                  Configure Steps
                </Button>
              </div>

              {/* --- Send Email Button --- */}
              <div className="pt-2">
                <Button
                  onClick={handleSendEmail}
                  disabled={loading || !recipientEmail || !customEmailMessage}
                  className="w-full h-12 text-base font-bold text-white shadow-lg shadow-emerald-900/10 transition-all bg-brand-primary hover:bg-brand-primary-hover"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" />
                      Send Verification Email
                    </>
                  )}
                </Button>
                <div className="mt-4">
                  <EmailStatusMessages
                    success={emailSentSuccess}
                    error={error}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: The Interactive Laptop */}
          <div className="flex-1 min-w-0 bg-gray-100/50 rounded-3xl border border-gray-200/50 p-2 sm:p-6 lg:p-10 flex items-center justify-center">
            <InteractiveEmailLaptop
              recipientEmail={recipientEmail}
              onRecipientChange={setRecipientEmail}
              subject={emailSubject}
              onSubjectChange={setEmailSubject}
              content={customEmailMessage}
              onContentChange={handleManualContentChange}
              isTemplateActive={!!activeTemplateId}
              isLoading={loading}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>

          {/* --- CONFIGURATION MODAL --- */}
          <Dialog open={configOpen} onOpenChange={setConfigOpen}>
            <DialogContent className="dashboard-theme sm:max-w-[1200px] p-0 overflow-hidden flex flex-col md:flex-row h-[85vh] max-h-[900px]">

              {/* Left Pane: Selection */}
              <div className="w-full md:w-5/12 p-8 flex flex-col bg-white overflow-y-auto border-r border-gray-100">
                <DialogHeader className="mb-8">
                  <DialogTitle className="text-2xl font-bold text-gray-900">Customize Onboarding</DialogTitle>
                  <DialogDescription className="text-sm mt-2 leading-relaxed">
                    Uncheck optional modules below to exclude them from this specific link.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 flex-1">
                  {CONFIG_MODULES.map((module) => {
                    const isIncluded = !excludedModules.includes(module.id);
                    return (
                      <div
                        key={module.id}
                        onMouseEnter={() => setPreviewModule(module.id)}
                        className={`flex items-start p-4 rounded-xl border-2 transition-all cursor-pointer ${isIncluded
                          ? "border-brand-primary bg-brand-primary-subtle/20 shadow-sm"
                          : "border-gray-100 bg-gray-50/50 hover:border-brand-primary/40"
                          }`}
                        onClick={() => toggleModule(module.id)}
                      >
                        <Checkbox
                          checked={isIncluded}
                          onCheckedChange={() => toggleModule(module.id)}
                          className="mt-1 h-5 w-5 data-[state=checked]:bg-brand-primary data-[state=checked]:border-brand-primary"
                        />
                        <div className="ml-4">
                          <p className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <module.icon className={`w-5 h-5 ${isIncluded ? "text-brand-primary" : "text-gray-400"}`} />
                            {module.label}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">{module.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <DialogFooter className="mt-8 pt-6 border-t border-gray-100 sm:justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">
                    {excludedModules.length > 0 ? `${excludedModules.length} modules excluded.` : "All modules included."}
                  </span>
                  <Button
                    onClick={(e) => { e.preventDefault(); setConfigOpen(false); }}
                    className="bg-brand-primary hover:bg-brand-primary-hover text-white h-11 px-8 text-base font-semibold shadow-md"
                  >
                    Save Configuration
                  </Button>
                </DialogFooter>
              </div>

              {/* Right Pane: Live Preview */}
              <div className="hidden md:flex w-full md:w-7/12 bg-slate-50/80 p-10 items-center justify-center flex-col relative">
                <div className="absolute top-6 left-6 z-20">
                  <Badge variant="secondary" className="bg-white/90 backdrop-blur-md text-gray-700 border border-gray-200 px-3 py-1 text-sm font-semibold shadow-sm">
                    Live Buyer Preview
                  </Badge>
                </div>

                <div className="relative w-full max-w-lg h-[460px] rounded-2xl shadow-xl border border-gray-200/60 bg-white transition-all duration-500 flex items-center justify-center p-6">
                  {CONFIG_MODULES.map((module) => (
                    <div
                      key={module.id}
                      className={`absolute inset-0 p-6 flex items-center justify-center transition-opacity duration-500 ease-in-out ${previewModule === module.id ? "opacity-100 z-10" : "opacity-0 z-0"}`}
                    >
                      <img
                        src={module.imagePath}
                        alt={`Preview of ${module.label}`}
                        /* Object-contain ensures the whole image fits, and the surrounding div creates the white border */
                        className="w-full h-full object-contain object-center rounded drop-shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://placehold.co/800x1200/f8fafc/94a3b8?text=${module.label.replace(/ /g, '+')}`;
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}