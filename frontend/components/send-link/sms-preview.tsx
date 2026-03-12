"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import type { CountryCode } from "@/lib/send-link";

interface SmsPreviewProps {
  recipientPhone: string;
  countryCode: CountryCode;
  message: string;
  onSend: () => void;
  disabled: boolean;
}

export function SmsPreview({
  recipientPhone,
  countryCode,
  message,
  onSend,
  disabled,
}: SmsPreviewProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="space-y-4 border-b border-gray-100 px-6 pb-4 pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Ready to text?
            </p>
            <p className="text-xs text-gray-500">
              Confirm the preview before sending the invitation.
            </p>
          </div>
          <Button
            onClick={onSend}
            disabled={disabled}
            className="gap-2 bg-brand-primary text-white hover:bg-brand-primary-hover"
            size="lg"
          >
            <Send className="h-4 w-4" />
            Send SMS
          </Button>
        </div>
        <div className="text-xs text-gray-400">
          {recipientPhone || `${countryCode.code} (555) 000-0000`}
        </div>
      </div>
      <div className="px-6 pb-6 pt-4">
        <div className="flex justify-center">
          <div className="relative w-full max-w-[220px] sm:max-w-[260px]">
            <Image
              src="/iphone-mockup.svg"
              alt="Phone preview shell"
              width={320}
              height={640}
              className="h-auto w-full"
              priority
            />
            <div className="absolute inset-x-6 top-20 bottom-16">
              <div className="flex h-full items-end">
                <div className="ml-auto max-w-[85%] rounded-2xl bg-brand-primary px-3 py-2 text-xs text-white shadow">
                  <p className="whitespace-pre-wrap break-words">
                    {message || "Your SMS message will preview here."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

