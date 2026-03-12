interface BrevoEmailParams {
  to: string;
  subject: string;
  htmlContent?: string;
  onboardingUrl?: string;
}

interface BrevoEmailResponse {
  messageId: string;
}

export async function sendBrevoEmail({
  to,
  subject,
  htmlContent,
  onboardingUrl,
}: BrevoEmailParams): Promise<BrevoEmailResponse> {
  try {
    const response = await fetch("/api/send-email", {
      method: "POST",
      body: JSON.stringify({
        to,
        subject,
        htmlContent: htmlContent || undefined,
        onboardingUrl,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          error: "Unknown error",
          details: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const errorMessage =
        errorData.details || errorData.error || "Failed to send email";

      console.error("[sendBrevoEmail] API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });

      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log("[sendBrevoEmail] Email sent successfully:", result);
    return result;
  } catch (error) {
    console.error("[sendBrevoEmail] Request failed:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Email sending failed: Unknown error");
  }
}
