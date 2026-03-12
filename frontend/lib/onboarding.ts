export type OnboardingModule =
  | "core" // Mandatory steps (cannot be excluded)
  | "company_info"
  | "signatory"
  | "trade_references"
  | "bank_connection"
  | "accounting"
  | "job_sheet";

export interface OnboardingStep {
  id: string;
  title: string;
  component: string;
  image?: string;
  module: OnboardingModule;
}

export const ONBOARDING_STEPS = [
  // --- CORE: Identity & Search ---
  {
    id: "sign-in",
    title: "Sign In",
    module: "core",
  },
  {
    id: "phone",
    title: "Type Your Phone Number",
    component: "PhoneInput",
    image: "/images/onboarding/phone.webp",
    module: "core",
  },
  {
    id: "phone-verification",
    title: "Verify Your Phone Number",
    component: "PhoneVerification",
    image: "/images/onboarding/phone-verification.webp",
    module: "core",
  },
  {
    id: "email",
    title: "Type Your Email Address",
    component: "EmailInput",
    image: "/images/onboarding/email.webp",
    module: "core",
  },
  {
    id: "email-verification",
    title: "Verify Your Email Address",
    component: "EmailVerification",
    image: "/images/onboarding/email-verification.webp",
    module: "core",
  },
  {
    id: "country",
    title: "Select Your Country",
    component: "CountrySelector",
    image: "/images/onboarding/country.webp",
    module: "core",
  },
  {
    id: "business",
    title: "Search For Your Business",
    component: "BusinessLookup",
    image: "/images/onboarding/business.webp",
    module: "core",
  },
  // --- MODULE 1: Extended Company Info ---
  {
    id: "business-information",
    title: "Business Information",
    component: "BusinessInformation",
    image: "/images/onboarding/business.webp",
    module: "company_info",
  },
  // --- MODULE 2: Signatories ---
  {
    id: "shareholders",
    title: "Add Shareholders",
    component: "ShareholdersForm",
    image: "/images/onboarding/shareholders.webp",
    module: "signatory",
  },
  // --- MODULE 3: References ---
  {
    id: "trade-references",
    title: "Add trade References",
    // component: "TradeReferences",
    // image: "/images/onboarding/shareholders.webp",
    module: "trade_references",
  },
  // --- MODULE 4: Job Sheet ---
  {
    id: "job-sheet",
    title: "Job Details",
    component: "JobSheet",
    module: "job_sheet",
  },
  // {
  //   id: "kyc",
  //   title: "Verify Your Identity (KYC)",
  //   component: "KYCVerification",
  //   image: "/images/onboarding/kyc.webp",
  // },
  // --- MODULE 5: Bank Connection ---
  {
    id: "bank-selection",
    title: "Select Your Bank",
    component: "BankSelection",
    image: "/images/onboarding/bank.png",
    module: "bank_connection",
  },
  {
    id: "bank-consent",
    title: "Bank Consent",
    component: "BankConsent",
    image: "/images/onboarding/bank.png",
    module: "bank_connection",
  },
  {
    id: "bank-redirect",
    title: "Bank Authentication",
    component: "BankRedirect",
    image: "/images/banks/piraeus-bank.png",
    module: "bank_connection",
  },
  {
    id: "bank-success",
    title: "Bank Connected Successfully",
    component: "BankSuccess",
    image: "/images/onboarding/bank.png",
    module: "bank_connection",
  },
  // {
  //   id: "erp-selection",
  //   title: "Select Your ERP",
  //   component: "ERPSelection",
  //   image: "/images/onboarding/erp.png",
  //   module: "accounting",
  // },
  // {
  //   id: "erp-consent",
  //   title: "ERP Consent",
  //   component: "ERPConsent",
  //   image: "/images/onboarding/erp.png",
  //   module: "accounting",
  // },
  // {
  //   id: "erp-success",
  //   title: "ERP Connected Successfully",
  //   component: "ERPSuccess",
  //   image: "/images/onboarding/erp.png",
  //   module: "accounting",
  // },
  // {
  //   id: "erp-credentials",
  //   title: "ERP Credentials",
  //   component: "ERPCredentials",
  //   image: "/images/onboarding/erp.png",
  //   module: "accounting",
  // },
  // {
  //   id: "platform-selection",
  //   title: "Select Your Platform",
  //   component: "PlatformSelection",
  //   image: "/images/platforms/woo-commerce-logo.png",
  //   module: "platform_connection",
  // },
  // {
  //   id: "platform-consent",
  //   title: "Platform Consent",
  //   component: "PlatformConsent",
  //   image: "/images/platforms/woo-commerce-logo.png",
  //   module: "platform_connection",
  // },
  // {
  //   id: "platform-success",
  //   title: "Platform Connected Successfully",
  //   component: "PlatformSuccess",
  //   image: "/images/platforms/woo-commerce-logo.png",
  //   module: "platform_connection",
  // },
  // {
  //   id: "social-media",
  //   title: "Social Media Profiles",
  //   component: "SocialMedia",
  //   image: "/images/onboarding/social.png",
  //   module: "social_media",
  // },

  // --- CORE: Terms --- This can not be excluded from the onboarding process, but it is treated as a separate module for visual purposes (onboarding step timeline issue).
  {
    id: "terms",
    title: "Terms and Conditions",
    component: "TermsAgreement",
    image: "/images/onboarding/terms.webp",
    module: "terms",
  },

  // --- MODULE 6: Acconunting (myDATA/ERP) ---
  {
    id: "data-processing",
    title: "Processing Your Data",
    component: "DataProcessing",
    image: "/images/onboarding/processing.png",
    module: "accounting",
  },
  {
    id: "mydata",
    title: "Connect with myDATA",
    component: "MyDataForm",
    image: "/images/myDATA/header.png",
    module: "accounting",
  },
  {
    id: "redirect",
    title: "Government Authentication",
    component: "RedirectForm",
    image: "/images/myDATA/header.png",
    module: "accounting",
  },
  {
    id: "pending",
    title: "myDATA Integration Pending",
    component: "PendingForm",
    image: "/images/onboarding/pending.webp",
    module: "accounting",
  },
] as const;

/**
 * ELITE ROUTING ENGINE
 * Calculates the next valid onboarding step, automatically jumping over excluded or skipped modules.
 * * @param currentId The ID of the current step
 * @param excludedModules Array of module IDs to skip entirely (e.g., from URL ?exclude=bank_connection)
 * @param skipCurrentModule If true, skips the rest of the steps in the current module (Handles manual skips elegantly)
 */
export function getNextOnboardingStep(
  currentId: string,
  excludedModules: string[] = [],
  skipCurrentModule: boolean = false,
): string | null {
  const currentIndex = ONBOARDING_STEPS.findIndex((s) => s.id === currentId);
  if (currentIndex === -1) return null;

  let nextIndex = currentIndex + 1;

  // Idiosyncrasy Logic: If user clicks "Skip" on Bank Selection, we jump over all remaining bank steps
  if (skipCurrentModule) {
    const currentModule = ONBOARDING_STEPS[currentIndex].module;
    while (
      nextIndex < ONBOARDING_STEPS.length &&
      ONBOARDING_STEPS[nextIndex].module === currentModule
    ) {
      nextIndex++;
    }
  }
  // Find the next step that is NOT in an excluded module
  while (nextIndex < ONBOARDING_STEPS.length) {
    const stepModule = ONBOARDING_STEPS[nextIndex].module;
    if (stepModule === "core" || !excludedModules.includes(stepModule)) {
      return ONBOARDING_STEPS[nextIndex].id;
    }
    nextIndex++;
  }

  return null;
}

/**
 * Calculates the previous valid onboarding step for the "Back" button.
 */
export function getPreviousOnboardingStep(
  currentId: string,
  excludedModules: string[] = [],
): string | null {
  const currentIndex = ONBOARDING_STEPS.findIndex((s) => s.id === currentId);
  if (currentIndex <= 0) return null;

  let prevIndex = currentIndex - 1;

  while (prevIndex >= 0) {
    const stepModule = ONBOARDING_STEPS[prevIndex].module;
    if (stepModule === "core" || !excludedModules.includes(stepModule)) {
      return ONBOARDING_STEPS[prevIndex].id;
    }
    prevIndex--;
  }

  return null;
}

export interface CountryCode {
  dialingCode: string;
  flag: string;
}

export const COUNTRY_CODES: Record<string, CountryCode> = {
  GREECE: { dialingCode: "+30", flag: "🇬🇷" },
  UNITED_KINGDOM: { dialingCode: "+44", flag: "🇬🇧" },
  GERMANY: { dialingCode: "+49", flag: "🇩🇪" },
  FRANCE: { dialingCode: "+33", flag: "🇫🇷" },
  ITALY: { dialingCode: "+39", flag: "🇮🇹" },
  SPAIN: { dialingCode: "+34", flag: "🇪🇸" },
  NETHERLANDS: { dialingCode: "+31", flag: "🇳🇱" },
  BELGIUM: { dialingCode: "+32", flag: "🇧🇪" },
  SWITZERLAND: { dialingCode: "+41", flag: "🇨🇭" },
  AUSTRIA: { dialingCode: "+43", flag: "🇦🇹" },
  SWEDEN: { dialingCode: "+46", flag: "🇸🇪" },
  NORWAY: { dialingCode: "+47", flag: "🇳🇴" },
  DENMARK: { dialingCode: "+45", flag: "🇩🇰" },
  FINLAND: { dialingCode: "+358", flag: "🇫🇮" },
  POLAND: { dialingCode: "+48", flag: "🇵🇱" },
  CZECH_REPUBLIC: { dialingCode: "+420", flag: "🇨🇿" },
  HUNGARY: { dialingCode: "+36", flag: "🇭🇺" },
  ROMANIA: { dialingCode: "+40", flag: "🇷🇴" },
  BULGARIA: { dialingCode: "+359", flag: "🇧🇬" },
  CROATIA: { dialingCode: "+385", flag: "🇭🇷" },
  SLOVENIA: { dialingCode: "+386", flag: "🇸🇮" },
  SLOVAKIA: { dialingCode: "+421", flag: "🇸🇰" },
  LITHUANIA: { dialingCode: "+370", flag: "🇱🇹" },
  LATVIA: { dialingCode: "+371", flag: "🇱🇻" },
  ESTONIA: { dialingCode: "+372", flag: "🇪🇪" },
  CYPRUS: { dialingCode: "+357", flag: "🇨🇾" },
  MALTA: { dialingCode: "+356", flag: "🇲🇹" },
  IRELAND: { dialingCode: "+353", flag: "🇮🇪" },
  PORTUGAL: { dialingCode: "+351", flag: "🇵🇹" },
  LUXEMBOURG: { dialingCode: "+352", flag: "🇱��" },
} as const;
