"use client";

import { Button } from "@/components/ui/button";
import { Settings, FileText } from "lucide-react";
import type { EmailTemplate } from "@/lib/email-templates";
import type { SmsTemplate } from "@/lib/sms-templates";
import { getTextPreview } from "@/lib/send-link";
import { TemplatesListSkeleton } from "./templates-list-skeleton";

interface TemplatesListProps {
  templates: EmailTemplate[] | SmsTemplate[];
  templateType: "email" | "sms";
  onInsertTemplate: (templateId: string) => void;
  onManageClick: () => void;
  loading?: boolean;
  activeTemplateId?: string | null;
}

export function TemplatesList({
  templates,
  templateType,
  onInsertTemplate,
  onManageClick,
  loading = false,
  activeTemplateId,
}: TemplatesListProps) {
  if (loading) {
    return <TemplatesListSkeleton />;
  }

  const title = templateType === "email" ? "Templates" : "Templates";
  const description =
    templateType === "email"
      ? "Choose a saved email layout to get started quickly."
      : "Use a saved SMS to keep messaging consistent.";

  return (
    <section className="flex flex-col flex-1 min-h-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between flex-shrink-0 mb-4">
        <div>
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onManageClick}
          className="text-xs"
        >
          <Settings className="mr-2 h-3 w-3" />
          Manage
        </Button>
      </div>
      <div className="flex flex-col gap-3 flex-1 overflow-y-auto min-h-0">
        {templates.map((template) => (
          <div
            key={template.id}
            className="rounded-xl border border-gray-200 p-4 transition hover:border-brand-primary hover:shadow-md flex-shrink-0"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-gray-100 p-2">
                <FileText className="h-4 w-4 text-gray-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  {template.name}
                </p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {templateType === "email"
                    ? getTextPreview(
                      (template as EmailTemplate).htmlContent,
                      80
                    )
                    : (template as SmsTemplate).message}
                </p>
              </div>
            </div>
            <Button
              onClick={() => onInsertTemplate(template.id)}
              size="sm"
              className="mt-4 w-full text-xs text-white"
            >
              {templateType === "email" ? "Send Template" : "Use Template"}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

