import { NextRequest, NextResponse } from "next/server";
import { BRAND_PRIMARY } from "@/lib/theme";

// Export runtime configuration for Vercel
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.error(
        "[send-email] BREVO_API_KEY is not set in environment variables",
      );
      return NextResponse.json(
        {
          error: "Email service configuration error",
          details: "BREVO_API_KEY environment variable is missing",
        },
        { status: 500 },
      );
    }

    const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("[send-email] Failed to parse request body:", parseError);
      return NextResponse.json(
        {
          error: "Invalid request body",
          details:
            parseError instanceof Error ? parseError.message : "Unknown error",
        },
        { status: 400 },
      );
    }

    // Validate required fields
    if (!body.to) {
      console.error("[send-email] Missing required field: to");
      return NextResponse.json(
        {
          error: "Missing required field",
          details: "Recipient email address (to) is required",
        },
        { status: 400 },
      );
    }

    if (!body.subject) {
      console.error("[send-email] Missing required field: subject");
      return NextResponse.json(
        {
          error: "Missing required field",
          details: "Email subject is required",
        },
        { status: 400 },
      );
    }

    const TEMPLATE_ID = 4;
    const ONBOARDING_LINK =
      body.onboardingUrl || "https://factora-core.vercel.app/email";

    // Build email data
    const emailData: any = {
      to: [{ email: body.to }],
      sender: {
        email: "info@factora.eu",
        name: "Factora",
      },
      subject: body.subject,
    };

    // Determine if we should use template or custom HTML content
    const hasCustomContent =
      body.htmlContent && body.htmlContent.trim().length > 0;

    if (hasCustomContent) {
      // Custom email workflow: append the onboarding link button to custom HTML content
      const linkButtonHtml = `
        <div style="margin-top: 32px; text-align: center;">
          <div style="display: inline-block; border: 1px solid #f3f4f6; background-color: #f9fafb; border-radius: 12px; padding: 20px 24px;">
            <div style="font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 4px;">Secure Link</div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 12px;">Link expires in 72 hours</div>
            <a href="${ONBOARDING_LINK}" style="display: inline-block; border-radius: 8px; background-color: ${BRAND_PRIMARY}; padding: 10px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
              Complete Your Onboarding
            </a>
          </div>
        </div>
      `;
      emailData.htmlContent = body.htmlContent + linkButtonHtml;
      console.log("[send-email] Sending custom email with HTML content");
    } else {
      // Template workflow: use Brevo template ID 4
      emailData.templateId = TEMPLATE_ID;
      emailData.params = {
        subject: body.subject,
      };
      console.log(
        "[send-email] Sending template email with template ID:",
        TEMPLATE_ID,
      );
    }

    const brevoResponse = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(emailData),
    });

    const data = await brevoResponse.json();

    if (!brevoResponse.ok) {
      console.error("[send-email] Brevo API error:", {
        status: brevoResponse.status,
        statusText: brevoResponse.statusText,
        response: data,
        emailType: hasCustomContent ? "custom" : "template",
      });
      return NextResponse.json(
        {
          error: data.message || "Failed to send email",
          details: data.error || data,
          status: brevoResponse.status,
        },
        { status: brevoResponse.status },
      );
    }

    console.log("[send-email] Email sent successfully:", {
      messageId: data.messageId,
      to: body.to,
      emailType: hasCustomContent ? "custom" : "template",
    });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("[send-email] Unexpected error:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        type: error instanceof Error ? error.name : undefined,
      },
      { status: 500 },
    );
  }
}
