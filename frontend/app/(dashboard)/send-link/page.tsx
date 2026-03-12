"use client";

import { useState, useEffect } from "react";
import { sendBrevoEmail } from "@/lib/email-service";
import { getEmailTemplates, getSmsTemplates } from "@/lib/template-storage";
import type { EmailTemplate } from "@/lib/email-templates";
import type { SmsTemplate } from "@/lib/sms-templates";
import { PageLayout } from "@/components/dashboard/page-layout";
import { SendLinkHeader } from "@/components/send-link/send-link-header";
import { SmsForm } from "@/components/send-link/sms-form";
import { EmailForm } from "@/components/send-link/email-form";

export default function SendLinkPage() {
  const [activeTab, setActiveTab] = useState<"sms" | "email">("email");
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [smsTemplates, setSmsTemplates] = useState<SmsTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  useEffect(() => {
    loadTemplates();

    const handleEmailUpdate = () => loadTemplates();
    const handleSmsUpdate = () => loadTemplates();

    window.addEventListener("emailTemplateUpdated", handleEmailUpdate);
    window.addEventListener("emailTemplateDeleted", handleEmailUpdate);
    window.addEventListener("smsTemplateUpdated", handleSmsUpdate);
    window.addEventListener("smsTemplateDeleted", handleSmsUpdate);

    return () => {
      window.removeEventListener("emailTemplateUpdated", handleEmailUpdate);
      window.removeEventListener("emailTemplateDeleted", handleEmailUpdate);
      window.removeEventListener("smsTemplateUpdated", handleSmsUpdate);
      window.removeEventListener("smsTemplateDeleted", handleSmsUpdate);
    };
  }, []);

  const loadTemplates = () => {
    setIsLoadingTemplates(true);
    try {
      setEmailTemplates(getEmailTemplates());
      setSmsTemplates(getSmsTemplates());
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleSendEmail = async (
    email: string,
    subject: string,
    content: string,
    customOnboardingUrl: string
  ) => {
    await sendBrevoEmail({
      to: email,
      subject,
      htmlContent: content,
      onboardingUrl: customOnboardingUrl,
    });
  };

  return (
    <PageLayout
      title="Send Onboarding Link"
      description="Invite customers to start their onboarding journey via SMS or Email"
      headerActions={
        <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
          <SendLinkHeader activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      }
    >
      {activeTab === "sms" && (
        <SmsForm templates={smsTemplates} loading={isLoadingTemplates} />
      )}

      {activeTab === "email" && (
        <EmailForm
          templates={emailTemplates}
          loading={isLoadingTemplates}
          onSendEmail={handleSendEmail}
        />
      )}
    </PageLayout>
  );
}
