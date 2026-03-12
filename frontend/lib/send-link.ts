import sendLinkData from "@/lib/data/send-link.json";

export interface CountryCode {
  flag: string;
  code: string;
}

export interface SendLinkData {
  emailProviders: string[];
  countryCodes: CountryCode[];
  onboardingLink: string;
}

export const SEND_LINK_DATA = sendLinkData as SendLinkData;

export const ONBOARDING_LINK = SEND_LINK_DATA.onboardingLink;
export const COUNTRY_CODES = SEND_LINK_DATA.countryCodes;

/**
 * Constructs a recipient email address from username and domain
 */
export function buildRecipientEmail(
  username: string,
  domain: string
): string {
  if (!username || !domain) return "";
  return `${username}@${domain}`;
}

/**
 * Constructs a recipient phone number from country code and phone number
 */
export function buildRecipientPhone(
  countryCode: CountryCode | null,
  phoneNumber: string
): string {
  if (!countryCode || !phoneNumber) return "";
  return `${countryCode.code}${phoneNumber}`;
}

/**
 * Checks if HTML content is empty (no text content after removing tags)
 */
export function isEmailContentEmpty(html: string): boolean {
  if (!html || !html.trim()) return true;
  const textContent = html.replace(/<[^>]*>/g, "").trim();
  return textContent.length === 0;
}

/**
 * Extracts text preview from HTML content
 */
export function getTextPreview(html: string, maxLength: number = 100): string {
  const text = html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLength
    ? text.substring(0, maxLength) + "..."
    : text;
}

/**
 * Validates email form inputs
 */
export function validateEmailForm(
  username: string,
  domain: string,
  subject: string,
  content: string
): { isValid: boolean; error?: string } {
  const isValidEmail = username && domain;

  if (!isValidEmail) {
    return { isValid: false, error: "Please provide a valid email address" };
  }

  if (!subject) {
    return { isValid: false, error: "Please provide an email subject" };
  }

  if (isEmailContentEmpty(content)) {
    return { isValid: false, error: "Please provide email content" };
  }

  return { isValid: true };
}

