"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Settings, FileText, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import type { SmsTemplate } from "@/lib/sms-templates";
import { COUNTRY_CODES, buildRecipientPhone, ONBOARDING_LINK } from "@/lib/send-link";
import type { CountryCode } from "@/lib/send-link";
import { TemplatesList } from "./templates-list";
import { SmsPreview } from "./sms-preview";

interface SmsFormProps {
  templates: SmsTemplate[];
  loading?: boolean;
}

export function SmsForm({ templates, loading = false }: SmsFormProps) {
  const router = useRouter();
  const [countryCode, setCountryCode] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [smsMessage, setSmsMessage] = useState("");

  const recipientPhone = buildRecipientPhone(countryCode, phoneNumber);

  const handleSendSms = () => {
    console.log("Sending SMS:", {
      recipient: recipientPhone,
      message: smsMessage,
      link: ONBOARDING_LINK,
    });
    setPhoneNumber("");
    setSmsMessage("");
  };

  const handleInsertTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSmsMessage(template.message);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
          {/* Left Column */}
          <div className="flex flex-col gap-6 min-h-0">
            <section className="space-y-5 rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm shadow-slate-100 flex-shrink-0">
              <div className="space-y-1.5">
                <Label htmlFor="recipient-phone">Recipient Phone Number *</Label>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex h-10 w-[120px] items-center gap-2 border-gray-300 bg-white px-3"
                        type="button"
                      >
                        <span className="text-base">{countryCode.flag}</span>
                        <span className="text-sm font-medium text-gray-700">
                          {countryCode.code}
                        </span>
                        <ChevronDown className="h-4 w-4 text-gray-600" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="max-h-[300px] overflow-y-auto">
                      {COUNTRY_CODES.map((country) => (
                        <DropdownMenuItem
                          key={country.code}
                          onSelect={() => setCountryCode(country)}
                          className="flex items-center gap-2"
                        >
                          <span className="text-base">{country.flag}</span>
                          <span className="text-sm font-medium text-gray-700">
                            {country.code}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Input
                    id="recipient-phone"
                    type="tel"
                    placeholder="555 000 0000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="bg-white flex-1"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sms-message">SMS Message *</Label>
                <Textarea
                  id="sms-message"
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  placeholder="Hi! You've been invited to start your onboarding with Factora."
                  rows={5}
                  className="bg-white"
                />
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Keep it concise so it fits in one text.</span>
                  <span>{smsMessage.length} / 160</span>
                </div>
              </div>
            </section>

            <TemplatesList
              templates={templates}
              templateType="sms"
              onInsertTemplate={handleInsertTemplate}
              onManageClick={() => router.push("/send-link/templates?tab=sms")}
              loading={loading}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <SmsPreview
              recipientPhone={recipientPhone}
              countryCode={countryCode}
              message={smsMessage}
              onSend={handleSendSms}
              disabled={!phoneNumber || !smsMessage}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

