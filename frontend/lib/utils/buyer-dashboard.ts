import { CREDIT_LIMIT_OPTIONS } from "@/lib/utils/credit-limits";
import {
  bankLogoMap,
  defaultBankLogo,
  insuranceLogoMap,
  defaultInsuranceLogo,
} from "@/lib/data/buyer-partners";

export const assignCreditLimit = (vat: string): number => {
  if (vat.toUpperCase() === "EL123456789") {
    return 200000;
  }
  const vatNumber = parseInt(vat.replace(/\D/g, ""), 10) || 0;
  const index = vatNumber % CREDIT_LIMIT_OPTIONS.length;
  return CREDIT_LIMIT_OPTIONS[index];
};

export const getScoreRating = (score: number): string => {
  if (score >= 800) return "Excellent";
  if (score >= 700) return "Good";
  if (score >= 600) return "Fair";
  return "Poor";
};

export const timeAgo = (iso: string): string => {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(1, Math.floor((now - then) / 1000));
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

export const getBankLogo = (bankName?: string | null): string | null => {
  if (!bankName) return null;
  return bankLogoMap[bankName] || defaultBankLogo;
};

export const getInsuranceLogo = (
  insuranceName?: string | null
): string | null => {
  if (!insuranceName) return null;
  return insuranceLogoMap[insuranceName] || defaultInsuranceLogo;
};

const erpMappings: Record<string, string> = {
  ENTERSOFTONE: "/images/erps/entersoft.png",
  "Epsilon Smart": "/images/erps/epsilon-smart.svg",
  Semantic: "/images/erps/semantic.png",
  QuickBooks: "/images/erps/qb.png",
  Xero: "/images/erps/xero.svg",
  Sage: "/images/erps/sage.svg",
  SAP: "/images/erps/sap.png",
  myDATA: "/images/erps/mydata.png",
  Oracle: "/images/erps/oracle.png",
  "Microsoft Dynamics": "/images/erps/dynamics.png",
};

export const getERPLogo = (erpName?: string | null): string | null => {
  if (!erpName) return null;
  return erpMappings[erpName] || "/images/erps/default-erp.png";
};

const platformMappings: Record<string, string> = {
  WooCommerce: "/images/platforms/woo-commerce-logo.png",
  Shopify: "/images/platforms/shopify-logo.png",
  Magento: "/images/platforms/magento-logo.png",
};

export const getPlatformLogo = (
  platformName?: string | null
): string | null => {
  if (!platformName) return null;
  return (
    platformMappings[platformName] || "/images/platforms/woo-commerce-logo.png"
  );
};
