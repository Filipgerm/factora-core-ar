export interface SmsTemplate {
  id: string;
  name: string;
  message: string;
  isDefault?: boolean;
}

export const smsTemplates: SmsTemplate[] = [
  {
    id: "onboarding-invitation",
    name: "Onboarding Invitation",
    message:
      "Hi! You've been invited to begin onboarding with Factora. Tap here to start your application: https://factora-core.vercel.app/onboarding/email",
    isDefault: true,
  },
];
