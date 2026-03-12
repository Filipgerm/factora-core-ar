"use client";

import { Button } from "@/components/ui/button";
import { Mail, MessageSquare } from "lucide-react";

interface SendLinkHeaderProps {
  activeTab: "sms" | "email";
  onTabChange: (tab: "sms" | "email") => void;
}

export function SendLinkHeader({
  activeTab,
  onTabChange,
}: SendLinkHeaderProps) {
  return (
    <>
      <Button
        variant={activeTab === "email" ? "default" : "outline"}
        onClick={() => onTabChange("email")}
      >
        <Mail className="mr-2 h-4 w-4" />
        Email Invitation
      </Button>
      <Button
        variant={activeTab === "sms" ? "default" : "outline"}
        onClick={() => onTabChange("sms")}
      >
        <MessageSquare className="mr-2 h-4 w-4" />
        SMS Invitation
      </Button>
    </>
  );
}

