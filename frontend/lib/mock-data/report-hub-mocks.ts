import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Calculator,
  CreditCard,
  FileBarChart,
  FileSpreadsheet,
  Landmark,
  LineChart,
  PieChart,
  Receipt,
  Scale,
  ScrollText,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

export interface ReportHubItem {
  id: string;
  title: string;
  icon: LucideIcon;
  defaultStarred?: boolean;
  defaultPinned?: boolean;
}

export interface ReportHubSection {
  id: string;
  title: string;
  reports: ReportHubItem[];
}

export const reportHubSections: ReportHubSection[] = [
  {
    id: "favorites",
    title: "Favorites",
    reports: [
      {
        id: "fav-income",
        title: "Income Statement",
        icon: FileBarChart,
        defaultStarred: true,
        defaultPinned: true,
      },
      {
        id: "fav-rev-waterfall",
        title: "Revenue Waterfall",
        icon: BarChart3,
        defaultStarred: true,
        defaultPinned: false,
      },
      {
        id: "fav-usage-waterfall",
        title: "Usage Waterfall",
        icon: LineChart,
        defaultStarred: false,
        defaultPinned: true,
      },
      {
        id: "fav-bva",
        title: "Budget vs Actual",
        icon: PieChart,
        defaultStarred: false,
        defaultPinned: false,
      },
    ],
  },
  {
    id: "financial-statement",
    title: "Financial Statement",
    reports: [
      {
        id: "fs-income",
        title: "Income Statement",
        icon: FileBarChart,
        defaultStarred: false,
        defaultPinned: false,
      },
      {
        id: "fs-balance",
        title: "Balance Sheet",
        icon: Scale,
        defaultStarred: false,
        defaultPinned: false,
      },
      {
        id: "fs-cashflow",
        title: "Cashflow Statement",
        icon: Landmark,
        defaultStarred: false,
        defaultPinned: false,
      },
      {
        id: "fs-exec-pnl",
        title: "Executive P&L",
        icon: TrendingUp,
        defaultStarred: false,
        defaultPinned: false,
      },
    ],
  },
  {
    id: "analytics",
    title: "Analytics",
    reports: [
      { id: "an-ar-aging", title: "AR Aging", icon: CreditCard },
      { id: "an-rev-cust", title: "Revenue by Customer", icon: BarChart3 },
      { id: "an-ap-aging", title: "AP Aging", icon: Receipt },
      { id: "an-exp-vendor", title: "Expenses by Vendor", icon: Wallet },
      { id: "an-exp-acct", title: "Expenses by Account", icon: FileSpreadsheet },
      { id: "an-net-burn", title: "Net Burn", icon: TrendingDown },
      { id: "an-runway", title: "Cash Runway", icon: LineChart },
      { id: "an-datalab", title: "Datalab", icon: PieChart },
      { id: "an-bva", title: "Budget vs Actual", icon: Calculator },
    ],
  },
  {
    id: "close-reports",
    title: "Close Reports",
    reports: [
      { id: "cr-tb", title: "Trial Balance", icon: BookOpen },
      { id: "cr-rev-waterfall", title: "Revenue Waterfall", icon: BarChart3 },
      { id: "cr-deferred", title: "Deferred Revenue", icon: ScrollText },
      { id: "cr-usage-waterfall", title: "Usage Waterfall", icon: LineChart },
      { id: "cr-prepaid", title: "Prepaid Schedule", icon: FileSpreadsheet },
      { id: "cr-gl", title: "General Ledger", icon: BookOpen },
      { id: "cr-1099", title: "1099 Report", icon: Receipt },
      { id: "cr-sales-tax", title: "Sales Tax Report", icon: Calculator },
      { id: "cr-vat", title: "VAT Report", icon: ScrollText },
      { id: "cr-cash-rec", title: "Cash Reconciliation", icon: Landmark },
      { id: "cr-billing", title: "Billing Forecast", icon: TrendingUp },
      { id: "cr-depr", title: "Depreciation Schedule", icon: PieChart },
    ],
  },
];
