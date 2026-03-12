export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  isDefault?: boolean;
}

export const emailTemplates: EmailTemplate[] = [
  {
    id: "onboarding-invitation",
    name: "Onboarding Invitation",
    subject: "Begin your onboarding application",
    htmlContent: `
      <div style="text-align: center; background-color: #f8f8f8; padding: 40px 20px; font-family: Arial, sans-serif;">
        <h1 style="font-size: 32px; font-weight: bold; color: #333333; margin: 0 0 24px 0; line-height: 1.2;">
          Begin your onboarding application
        </h1>
        <p style="font-size: 16px; font-weight: normal; color: #333333; margin: 0 0 16px 0; line-height: 1.5;">
          You have been requested to begin the onboarding process by {} in order to trade with them
        </p>
        <p style="font-size: 16px; font-weight: normal; color: #333333; margin: 0; line-height: 1.5;">
          Click the Button below to get started
        </p>
      </div>
    `.trim(),
    isDefault: true,
  },
];
