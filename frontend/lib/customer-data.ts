/**
 * Utility functions for generating customer-specific placeholder data
 * Based on customer slug to ensure consistent but unique data per customer
 */

// Financial scaling factor for the Financial Overview tab
const FINANCIAL_SCALE_FACTOR = 0.1945;

// Simple hash function to convert string to number
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Seeded random number generator
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export interface CustomerMetrics {
  annualTurnover: string;
  turnoverChange: string;
  turnoverTrend: "up" | "down";
  margin: string;
  marginTarget: string;
  ebitda: string;
  ebitdaChange: string;
  ebitdaTrend: "up" | "down";
  balance: string;
  balanceChange: string;
  balanceTrend: "up" | "down";
  creditLimit: string;
  creditLimitChange: string;
  creditLimitTrend: "up" | "down";
  outstandingAR: string;
  outstandingARChange: string;
  outstandingARTrend: "up" | "down";
  dso: string;
  dsoChange: string;
  dsoTrend: "up" | "down";
  defaultRate: string;
  defaultRateChange: string;
  defaultRateTrend: "up" | "down";
}

export interface CustomerSalesData {
  month: string;
  sales: number;
  cashFlow: number;
  revenue: number;
  expenses: number;
}

export interface CustomerARAPData {
  month: string;
  ar: number;
  ap: number;
}

export interface CustomerConcentration {
  topCustomersPercentage: number;
}

export interface CustomerPLData {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

export interface IncomeExpensesData {
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  ebitda: number;
  ebitdaMargin: number;
  netIncome: number;
  netMargin: number;
  revenueChange: number;
  revenueTrend: "up" | "down";
}

export interface ARAPData {
  outstandingAR: number;
  arChange: number;
  arTrend: "up" | "down";
  arDefaultRate: number;
  arDefaultRateChange: number;
  arDefaultRateTrend: "up" | "down";
  dso: number;
  dsoChange: number;
  dsoTrend: "up" | "down";
  outstandingAP: number;
  apChange: number;
  apTrend: "up" | "down";
  apDefaultRate: number;
  apDefaultRateChange: number;
  apDefaultRateTrend: "up" | "down";
  dpo: number;
  dpoChange: number;
  dpoTrend: "up" | "down";
}

export interface PaymentDistributionBucket {
  count: number;
  outstanding: number;
  total: number;
}

export interface PaymentDistributionData {
  days1to30: PaymentDistributionBucket;
  days31to60: PaymentDistributionBucket;
  days61to90: PaymentDistributionBucket;
  days91to120: PaymentDistributionBucket;
  days121Plus: PaymentDistributionBucket;
  total: PaymentDistributionBucket;
}

export interface InventoryData {
  stockOnHand: number;
  stockOnHandChange: number;
  stockOnHandTrend: "up" | "down";
  costingMethod: string;
  dio: number;
  dioChange: number;
  dioTrend: "up" | "down";
  inventoryTurnover: number;
  inventoryTurnoverTarget: number;
  slowObsoleteStock: number;
  slowObsoleteStockPercent: number;
  slowStockThreshold: number;
}

export interface FixedAssetsData {
  netPPE: number;
  netPPEChange: number;
  netPPETrend: "up" | "down";
  depreciation: number;
  depreciationChange: number;
  depreciationTrend: "up" | "down";
  depreciationMethod: string;
  capexAdditions: number;
  capexDisposals: number;
  netCapex: number;
  eligibleCollateral: number;
  collateralHaircut: number;
}

export interface TaxObligationsData {
  totalTaxPayables: number;
  totalTaxPayablesChange: number;
  totalTaxPayablesTrend: "up" | "down";
  vatOutput: number;
  vatInput: number;
  vatNet: number;
  vatPosition: "payable" | "receivable";
  vatDueDate: string;
  payrollTaxesDue: number;
  payrollCycleLabel: string;
  payrollDaysLeft: number;
  filingStatus: "up-to-date" | "overdue";
  filingOnTimeL12M: number;
  filingTotalL12M: number;
}

// Generate customer-specific metrics
export function generateCustomerMetrics(customerSlug: string): CustomerMetrics {
  const seed = hashCode(customerSlug);
  const random = (offset: number = 0) => seededRandom(seed + offset);

  // Base values that will be modified per customer
  const baseTurnover = (1500000 + random(1) * 6500000) * FINANCIAL_SCALE_FACTOR; // €1.5M–€8.0M range typical for SMEs
  const baseEbitda = baseTurnover * (0.08 + random(2) * 0.08); // 8–16% of turnover
  const baseCreditLimit = baseTurnover * (0.4 + random(3) * 0.5); // 40–90% of turnover
  const baseAR = baseTurnover * (0.06 + random(4) * 0.12); // 6–18% of turnover
  const baseBalance = baseTurnover * (0.08 + random(5) * 0.24); // 8–32% of turnover
  const baseDSO = 30 + random(6) * 25; // 30–55 days (unchanged - not monetary)

  // Generate change percentages (SME-realistic ranges)
  // Sustainable sales growth around ~7.3% with modest variance
  const turnoverChange = Math.floor(4 + random(7) * 8); // +4% to +12%
  const ebitdaChange = Math.floor(random(8) * 11); // 0% to +10%
  const creditChange = Math.floor(random(9) * 11); // 0% to +10%
  const arChange = Math.floor(random(10) * 21 - 10); // -10% to +10%
  const balanceChange = Math.floor(random(11) * 21 - 5); // -5% to +15%
  const dsoChange = Math.floor(random(12) * 26 - 15); // -15% to +10%
  const defaultRateChange = Math.floor(random(13) * 11 - 5); // -5% to +5%

  const metrics: CustomerMetrics = {
    annualTurnover: `€${Math.floor(baseTurnover).toLocaleString()}.00`,
    turnoverChange: `${Math.abs(turnoverChange)}% ${
      turnoverChange >= 0 ? "increase" : "decrease"
    } from last year`,
    turnoverTrend: turnoverChange >= 0 ? "up" : "down",
    margin: `${(10 + random(14) * 8).toFixed(1)}%`, // 10–18%
    marginTarget: `${(12 + random(15) * 8).toFixed(1)}%`, // 12–20%
    ebitda: `€${Math.floor(baseEbitda).toLocaleString()}.00`,
    ebitdaChange: `${Math.abs(ebitdaChange)}% ${
      ebitdaChange >= 0 ? "increase" : "decrease"
    } from last year`,
    ebitdaTrend: ebitdaChange >= 0 ? "up" : "down",
    balance: `€${Math.floor(baseBalance).toLocaleString()}.00`,
    balanceChange: `${Math.abs(balanceChange)}% ${
      balanceChange >= 0 ? "increase" : "decrease"
    } from last year`,
    balanceTrend: balanceChange >= 0 ? "up" : "down",
    creditLimit: `€${Math.floor(baseCreditLimit).toLocaleString()}.00`,
    creditLimitChange: `${Math.abs(creditChange)}% ${
      creditChange >= 0 ? "increase" : "decrease"
    } from last year`,
    creditLimitTrend: creditChange >= 0 ? "up" : "down",
    outstandingAR: `€${Math.floor(baseAR).toLocaleString()}`,
    outstandingARChange: `${Math.abs(arChange)}% ${
      arChange >= 0 ? "increase" : "decrease"
    } from last year`,
    outstandingARTrend: arChange >= 0 ? "up" : "down",
    dso: `${Math.floor(baseDSO)} Days`,
    dsoChange: `${Math.abs(dsoChange)}% ${
      dsoChange <= 0 ? "Decrease" : "Increase"
    } from last year`,
    dsoTrend: dsoChange <= 0 ? "down" : "up", // Lower DSO is better
    defaultRate: `${(0.5 + random(16) * 4.5).toFixed(2)}%`, // 0.5-5.0% range
    defaultRateChange: `${Math.abs(defaultRateChange)}% ${
      defaultRateChange <= 0 ? "decrease" : "increase"
    } from last year`,
    defaultRateTrend: defaultRateChange <= 0 ? "down" : "up", // Lower default rate is better
  };

  // Overrides for specific customers
  if (customerSlug === "euromed-supplies-gmbh") {
    metrics.dso = "53 Days";
    metrics.defaultRate = "1.50%";
    metrics.ebitda = `€${Math.floor(
      356359.63 * FINANCIAL_SCALE_FACTOR
    ).toLocaleString()}.00`;
  }

  // Override for Kaminaris - set annual turnover to €645,349
  if (customerSlug === "customer-el123456789") {
    metrics.annualTurnover = "€645,349.00";
    // Adjust EBITDA proportionally (assuming ~10% of revenue)
    metrics.ebitda = "€64,535.00";
  }

  return metrics;
}

// Generate customer-specific P&L data based on annual turnover
// This ensures P&L Total Revenue matches Annual Turnover exactly
export function generateCustomerPLData(customerSlug: string): CustomerPLData {
  const seed = hashCode(customerSlug);
  const random = (offset: number = 0) => seededRandom(seed + offset);

  // Use the same base turnover calculation as generateCustomerMetrics
  // This ensures the revenue matches annual turnover exactly
  const baseTurnover = (1500000 + random(1) * 6500000) * FINANCIAL_SCALE_FACTOR;

  // Override for Kaminaris - set revenue to €645,349
  if (customerSlug === "customer-el123456789") {
    const kaminarisRevenue = 645349;
    const kaminarisExpenseRatio = 0.88; // 88% of revenue = realistic SME expense ratio
    const kaminarisExpenses = kaminarisRevenue * kaminarisExpenseRatio;
    const kaminarisNetIncome = kaminarisRevenue - kaminarisExpenses;

    return {
      totalRevenue: kaminarisRevenue,
      totalExpenses: kaminarisExpenses,
      netIncome: kaminarisNetIncome,
    };
  }

  // Calculate expenses as a percentage of revenue (realistic SME range: 85-92% of revenue)
  // This gives profit margins of 8-15%, which is typical for SMEs
  const expenseRatio = 0.85 + random(20) * 0.07; // 85-92% of revenue
  const totalExpenses = baseTurnover * expenseRatio;
  const netIncome = baseTurnover - totalExpenses;

  return {
    totalRevenue: baseTurnover,
    totalExpenses: totalExpenses,
    netIncome: netIncome,
  };
}

// Generate customer-specific income and expenses data
export function generateIncomeExpensesData(
  customerSlug: string
): IncomeExpensesData {
  const seed = hashCode(customerSlug);
  const random = (offset: number = 0) => seededRandom(seed + offset);

  // Get base P&L data
  const plData = generateCustomerPLData(customerSlug);
  const revenue = plData.totalRevenue;
  const totalExpenses = plData.totalExpenses;
  const netIncome = plData.netIncome;

  // Calculate COGS as 60-70% of total expenses (realistic for SMEs)
  const cogsRatio = 0.6 + random(100) * 0.1; // 60-70%
  const cogs = totalExpenses * cogsRatio;

  // Calculate Gross Profit = Revenue - COGS
  const grossProfit = revenue - cogs;

  // Calculate Gross Margin % = (Gross Profit / Revenue) * 100
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  // Calculate Interest (~2-5% of revenue)
  const interestRate = 0.02 + random(101) * 0.03; // 2-5%
  const interest = revenue * interestRate;

  // Calculate Operating Expenses = Total Expenses - COGS - Interest - Taxes
  // First, estimate taxes based on profit before tax
  // Taxes are typically 15-25% of (Revenue - COGS - Opex - Interest)
  // We need to solve: Opex = Total Expenses - COGS - Interest - Taxes
  // Where Taxes = taxRate * (Revenue - COGS - Opex - Interest)
  // This creates a circular dependency, so we'll estimate Opex first
  // then calculate taxes, then adjust

  // Estimate Opex as remaining expenses after COGS and Interest
  // Opex typically represents 15-25% of revenue for SMEs
  const opexRatioEstimate = 0.15 + random(102) * 0.1; // 15-25%
  let operatingExpenses = revenue * opexRatioEstimate;

  // Calculate profit before tax
  const profitBeforeTax = revenue - cogs - operatingExpenses - interest;

  // Calculate taxes (15-25% of profit before tax, but not negative)
  const taxRate = 0.15 + random(103) * 0.1; // 15-25%
  let taxes = Math.max(0, profitBeforeTax * taxRate);

  // Recalculate operating expenses to match total expenses
  // Total Expenses = COGS + Operating Expenses + Interest + Taxes
  // Operating Expenses = Total Expenses - COGS - Interest - Taxes
  operatingExpenses = totalExpenses - cogs - interest - taxes;

  // Ensure operating expenses is not negative
  if (operatingExpenses < 0) {
    // If negative, adjust by reducing taxes proportionally
    const adjustment = Math.abs(operatingExpenses);
    taxes = Math.max(0, taxes - adjustment);
    operatingExpenses = totalExpenses - cogs - interest - taxes;
  }

  // Calculate EBITDA = Gross Profit - Operating Expenses (before interest, taxes, depreciation, amortization)
  // Since we're calculating operating expenses that exclude D&A, EBITDA = Gross Profit - Operating Expenses
  // However, to be more realistic, EBITDA is typically higher than operating income
  // Let's calculate: EBITDA = Revenue - COGS - Operating Expenses (excluding D&A portion)
  // For SMEs, EBITDA margin is typically 8-20% of revenue
  const ebitdaMarginTarget = 0.08 + random(104) * 0.12; // 8-20%
  const ebitda = revenue * ebitdaMarginTarget;
  const ebitdaMargin = ebitdaMarginTarget * 100;

  // Calculate Net Margin % = (Net Income / Revenue) * 100
  const netMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0;

  // Generate YoY change for revenue (similar to existing metrics)
  const revenueChange = Math.floor(4 + random(105) * 8); // +4% to +12%
  const revenueTrend: "up" | "down" = revenueChange >= 0 ? "up" : "down";

  return {
    revenue,
    cogs,
    grossProfit,
    grossMargin,
    ebitda,
    ebitdaMargin,
    netIncome,
    netMargin,
    revenueChange,
    revenueTrend,
  };
}

// Generate customer-specific AR and AP data
export function generateARAPData(customerSlug: string): ARAPData {
  const seed = hashCode(customerSlug);
  const random = (offset: number = 0) => seededRandom(seed + offset);

  // Get existing metrics which include AR and DSO
  const metrics = generateCustomerMetrics(customerSlug);

  // Parse Outstanding AR from string format (e.g., "€274,932" -> 274932)
  const arString = metrics.outstandingAR.replace(/[€,.\s]/g, "");
  const outstandingAR = parseFloat(arString) || 0;

  // Parse AR change percentage from string (e.g., "13% increase from last year" -> 13)
  const arChangeMatch = metrics.outstandingARChange.match(/(\d+)%/);
  const arChange = arChangeMatch ? parseInt(arChangeMatch[1]) : 0;
  const arTrend = metrics.outstandingARTrend;

  // Parse DSO from string format (e.g., "38 Days" -> 38)
  const dsoMatch = metrics.dso.match(/(\d+)/);
  const dso = dsoMatch ? parseInt(dsoMatch[1]) : 0;

  // Parse DSO change percentage from string
  const dsoChangeMatch = metrics.dsoChange.match(/(\d+)%/);
  const dsoChange = dsoChangeMatch ? parseInt(dsoChangeMatch[1]) : 0;
  const dsoTrend = metrics.dsoTrend;

  // Parse default rate from CustomerMetrics (e.g., "1.50%" -> 1.50)
  const defaultRateMatch = metrics.defaultRate.match(/(\d+\.?\d*)%/);
  const baseDefaultRate = defaultRateMatch
    ? parseFloat(defaultRateMatch[1])
    : 2.5;

  // Generate AR default rate: typically 0.5-5.0% for SMEs
  // Use base default rate with some variation
  const arDefaultRate = baseDefaultRate + (random(204) * 2 - 1); // ±1% variation
  const arDefaultRateValue = Math.max(0.5, Math.min(5.0, arDefaultRate));

  // Generate AR default rate change (-5% to +5%)
  const arDefaultRateChange = Math.floor(random(205) * 11 - 5);
  const arDefaultRateTrend: "up" | "down" =
    arDefaultRateChange <= 0 ? "down" : "up"; // Lower is better

  // Calculate Outstanding AP: Typically 40-60% of Outstanding AR for SMEs
  const apRatio = 0.4 + random(200) * 0.2; // 40-60%
  const outstandingAP = outstandingAR * apRatio;

  // Generate YoY change for AP (-10% to +10%)
  const apChange = Math.floor(random(201) * 21 - 10);
  const apTrend: "up" | "down" = apChange >= 0 ? "up" : "down";

  // Generate AP default rate: typically 0.5-5.0% for SMEs, similar to AR but can vary
  const apDefaultRate = baseDefaultRate + (random(206) * 2 - 1); // ±1% variation
  const apDefaultRateValue = Math.max(0.5, Math.min(5.0, apDefaultRate));

  // Generate AP default rate change (-5% to +5%)
  const apDefaultRateChange = Math.floor(random(207) * 11 - 5);
  const apDefaultRateTrend: "up" | "down" =
    apDefaultRateChange <= 0 ? "down" : "up"; // Lower is better

  // Calculate DPO: Typically 25-45 days for SMEs (similar range to DSO but can vary)
  const dpo = 25 + random(202) * 20; // 25-45 days

  // Generate DPO change percentage (-15% to +10%)
  const dpoChange = Math.floor(random(203) * 26 - 15);
  const dpoTrend: "up" | "down" = dpoChange <= 0 ? "down" : "up"; // Lower DPO is better (like DSO)

  return {
    outstandingAR,
    arChange,
    arTrend,
    arDefaultRate: arDefaultRateValue,
    arDefaultRateChange,
    arDefaultRateTrend,
    dso,
    dsoChange,
    dsoTrend,
    outstandingAP,
    apChange,
    apTrend,
    apDefaultRate: apDefaultRateValue,
    apDefaultRateChange,
    apDefaultRateTrend,
    dpo,
    dpoChange,
    dpoTrend,
  };
}

// Helper function to generate payment distribution buckets
function generatePaymentDistributionBuckets(
  seed: number,
  outstandingTotal: number,
  totalValue: number,
  baseOffset: number
): PaymentDistributionData {
  const random = (offset: number = 0) =>
    seededRandom(seed + baseOffset + offset);

  // Generate realistic distribution percentages for outstanding amounts
  // Most invoices (70-85%) should be in 1-30 days
  const percent1to30 = 0.7 + random(0) * 0.15; // 70-85%
  const percent31to60 = 0.08 + random(1) * 0.07; // 8-15%
  const percent61to90 = 0.03 + random(2) * 0.04; // 3-7%
  const percent91to120 = 0.01 + random(3) * 0.02; // 1-3%
  // Remaining goes to 121+
  const percent121Plus =
    1 - percent1to30 - percent31to60 - percent61to90 - percent91to120;

  // Calculate outstanding amounts for each range (using percentages)
  let outstanding1to30 = outstandingTotal * percent1to30;
  let outstanding31to60 = outstandingTotal * percent31to60;
  let outstanding61to90 = outstandingTotal * percent61to90;
  let outstanding91to120 = outstandingTotal * percent91to120;
  let outstanding121Plus = outstandingTotal * percent121Plus;

  // Distribute total amounts using same percentages
  let total1to30 = totalValue * percent1to30;
  let total31to60 = totalValue * percent31to60;
  let total61to90 = totalValue * percent61to90;
  let total91to120 = totalValue * percent91to120;
  let total121Plus = totalValue * percent121Plus;

  // Floor all values to get integers
  outstanding1to30 = Math.floor(outstanding1to30);
  outstanding31to60 = Math.floor(outstanding31to60);
  outstanding61to90 = Math.floor(outstanding61to90);
  outstanding91to120 = Math.floor(outstanding91to120);
  outstanding121Plus = Math.floor(outstanding121Plus);

  total1to30 = Math.floor(total1to30);
  total31to60 = Math.floor(total31to60);
  total61to90 = Math.floor(total61to90);
  total91to120 = Math.floor(total91to120);
  total121Plus = Math.floor(total121Plus);

  // Adjust the last bucket (121+) to ensure totals match exactly
  // This accounts for any rounding differences
  const outstandingSum =
    outstanding1to30 +
    outstanding31to60 +
    outstanding61to90 +
    outstanding91to120 +
    outstanding121Plus;
  outstanding121Plus += Math.floor(outstandingTotal) - outstandingSum;

  const totalSum =
    total1to30 + total31to60 + total61to90 + total91to120 + total121Plus;
  total121Plus += Math.floor(totalValue) - totalSum;

  // Ensure no negative values
  outstanding121Plus = Math.max(0, outstanding121Plus);
  total121Plus = Math.max(0, total121Plus);

  // Generate invoice counts (realistic average invoice amount: 500-2000 EUR)
  const avgInvoiceAmount = 500 + random(10) * 1500; // 500-2000 EUR
  const count1to30 = Math.max(0, Math.floor(total1to30 / avgInvoiceAmount));
  const count31to60 = Math.max(0, Math.floor(total31to60 / avgInvoiceAmount));
  const count61to90 = Math.max(0, Math.floor(total61to90 / avgInvoiceAmount));
  const count91to120 = Math.max(0, Math.floor(total91to120 / avgInvoiceAmount));
  const count121Plus = Math.max(0, Math.floor(total121Plus / avgInvoiceAmount));

  // Calculate totals
  const totalCount =
    count1to30 + count31to60 + count61to90 + count91to120 + count121Plus;

  return {
    days1to30: {
      count: count1to30,
      outstanding: outstanding1to30,
      total: total1to30,
    },
    days31to60: {
      count: count31to60,
      outstanding: outstanding31to60,
      total: total31to60,
    },
    days61to90: {
      count: count61to90,
      outstanding: outstanding61to90,
      total: total61to90,
    },
    days91to120: {
      count: count91to120,
      outstanding: outstanding91to120,
      total: total91to120,
    },
    days121Plus: {
      count: count121Plus,
      outstanding: outstanding121Plus,
      total: total121Plus,
    },
    total: {
      count: totalCount,
      outstanding: Math.floor(outstandingTotal),
      total: Math.floor(totalValue),
    },
  };
}

// Generate customer-specific receivables payment distribution data
export function generateReceivablesPaymentDistribution(
  customerSlug: string
): PaymentDistributionData {
  const seed = hashCode(customerSlug);

  // Get AR data and income data
  const arapData = generateARAPData(customerSlug);
  const incomeData = generateIncomeExpensesData(customerSlug);

  // For receivables:
  // Outstanding should match Outstanding AR
  // Total should match Annual Turnover (revenue)
  const outstandingTotal = arapData.outstandingAR;
  const totalValue = incomeData.revenue;

  return generatePaymentDistributionBuckets(
    seed,
    outstandingTotal,
    totalValue,
    300
  );
}

// Generate customer-specific payables payment distribution data
export function generatePayablesPaymentDistribution(
  customerSlug: string
): PaymentDistributionData {
  const seed = hashCode(customerSlug);

  // Get AP data and income data
  const arapData = generateARAPData(customerSlug);
  const incomeData = generateIncomeExpensesData(customerSlug);

  // For payables:
  // Outstanding should match Outstanding AP
  // Total should match Annual Turnover - Gross Profit
  // Annual Turnover - Gross Profit = Revenue - (Revenue - COGS) = COGS
  const outstandingTotal = arapData.outstandingAP;
  const totalValue = incomeData.revenue - incomeData.grossProfit; // This equals COGS

  return generatePaymentDistributionBuckets(
    seed,
    outstandingTotal,
    totalValue,
    400
  );
}

// Legacy function for backward compatibility - returns receivables data
export function generatePaymentDistributionData(
  customerSlug: string
): PaymentDistributionData {
  return generateReceivablesPaymentDistribution(customerSlug);
}

// Generate customer-specific inventory data
export function generateInventoryData(customerSlug: string): InventoryData {
  const seed = hashCode(customerSlug);
  const random = (offset: number = 0) => seededRandom(seed + offset);

  // Get revenue and COGS from income/expenses data
  const incomeData = generateIncomeExpensesData(customerSlug);
  const revenue = incomeData.revenue;
  const cogs = incomeData.cogs;

  // Calculate Stock on Hand: typically 10-20% of annual revenue for SMEs
  const stockRatio = 0.1 + random(400) * 0.1; // 10-20%
  const stockOnHand = revenue * stockRatio;

  // Generate YoY change for stock on hand (-5% to +15%)
  const stockOnHandChange = Math.floor(random(401) * 21 - 5);
  const stockOnHandTrend: "up" | "down" =
    stockOnHandChange >= 0 ? "up" : "down";

  // Select costing method
  const costingMethods = ["FIFO", "LIFO", "Weighted Avg"];
  const costingMethod =
    costingMethods[Math.floor(random(402) * costingMethods.length)];

  // Calculate DIO using normal distribution: mean 70 days, std dev 5 days
  // For kaminaris customer, set DIO to exactly 70
  let dioRounded: number;
  if (customerSlug === "customer-el123456789") {
    // Kaminaris: exactly 70 days
    dioRounded = 70;
  } else {
    // Generate normally distributed DIO using Box-Muller transform
    // Mean: 70, Standard Deviation: 5
    const random1 = Math.sin(seed + 500) * 10000;
    let u1 = Math.abs(random1 - Math.floor(random1));
    // Ensure u1 is not 0 to avoid -Infinity in log
    if (u1 === 0) u1 = 0.0001;
    if (u1 >= 1) u1 = 0.9999;

    const random2 = Math.sin((seed + 500) * 2 + 1) * 10000;
    const u2 = Math.abs(random2 - Math.floor(random2));

    // Box-Muller transform
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const value = 70 + 5 * z; // Mean 70, std dev 5

    // Clamp to reasonable range (55-85 days, allowing for 3 standard deviations)
    dioRounded = Math.max(55, Math.min(85, Math.round(value)));
  }

  // Generate DIO change (-10% to +10%)
  const dioChange = Math.floor(random(403) * 21 - 10);
  const dioTrend: "up" | "down" = dioChange <= 0 ? "down" : "up"; // Lower DIO is better

  // Calculate Inventory Turnover: typically 4-12 times per year
  // Turnover = COGS / Average Inventory
  const inventoryTurnover = stockOnHand > 0 ? cogs / stockOnHand : 0;
  const turnoverRounded = Math.max(
    4,
    Math.min(12, parseFloat(inventoryTurnover.toFixed(1)))
  );

  // Generate target (slightly higher than actual, typically)
  const inventoryTurnoverTarget = turnoverRounded + (0.5 + random(404) * 1.5); // +0.5 to +2.0

  // Calculate slow/obsolete stock: 2-8% of total inventory
  const slowStockPercent = 0.02 + random(405) * 0.06; // 2-8%
  const slowObsoleteStock = stockOnHand * slowStockPercent;
  const slowObsoleteStockPercentRounded = slowStockPercent * 100;

  // Select threshold (90, 180, or 360 days)
  const thresholds = [90, 180, 360];
  const slowStockThreshold =
    thresholds[Math.floor(random(406) * thresholds.length)];

  return {
    stockOnHand,
    stockOnHandChange,
    stockOnHandTrend,
    costingMethod,
    dio: dioRounded,
    dioChange,
    dioTrend,
    inventoryTurnover: turnoverRounded,
    inventoryTurnoverTarget: parseFloat(inventoryTurnoverTarget.toFixed(1)),
    slowObsoleteStock,
    slowObsoleteStockPercent: parseFloat(
      slowObsoleteStockPercentRounded.toFixed(1)
    ),
    slowStockThreshold,
  };
}

// Generate customer-specific fixed assets data
export function generateFixedAssetsData(customerSlug: string): FixedAssetsData {
  const seed = hashCode(customerSlug);
  const random = (offset: number = 0) => seededRandom(seed + offset);

  // Get revenue from income/expenses data
  const incomeData = generateIncomeExpensesData(customerSlug);
  const revenue = incomeData.revenue;

  // Calculate Net PPE: typically 15-40% of annual revenue for SMEs
  const ppeRatio = 0.15 + random(500) * 0.25; // 15-40%
  const netPPE = revenue * ppeRatio;

  // Generate YoY change for Net PPE (-5% to +20%)
  const netPPEChange = Math.floor(random(501) * 26 - 5);
  const netPPETrend: "up" | "down" = netPPEChange >= 0 ? "up" : "down";

  // Calculate depreciation: typically 5-15% of Net PPE annually
  const depreciationRate = 0.05 + random(502) * 0.1; // 5-15%
  const depreciation = netPPE * depreciationRate;

  // Generate YoY change for depreciation (-10% to +10%)
  const depreciationChange = Math.floor(random(503) * 21 - 10);
  const depreciationTrend: "up" | "down" =
    depreciationChange >= 0 ? "up" : "down";

  // Select depreciation method
  const depreciationMethods = ["Straight-line", "Declining Balance"];
  const depreciationMethod =
    depreciationMethods[Math.floor(random(504) * depreciationMethods.length)];

  // Calculate CapEx: additions and disposals
  // Additions: typically 5-20% of Net PPE
  const additionsRatio = 0.05 + random(505) * 0.15; // 5-20%
  const capexAdditions = netPPE * additionsRatio;

  // Disposals: typically 2-10% of Net PPE
  const disposalsRatio = 0.02 + random(506) * 0.08; // 2-10%
  const capexDisposals = netPPE * disposalsRatio;

  // Net CapEx = Additions − Disposals
  const netCapex = capexAdditions - capexDisposals;

  // Calculate eligible collateral: Net PPE × haircut (typically 20-40%)
  const collateralHaircut = 20 + Math.floor(random(507) * 21); // 20-40%
  const eligibleCollateral = netPPE * (collateralHaircut / 100);

  return {
    netPPE,
    netPPEChange,
    netPPETrend,
    depreciation,
    depreciationChange,
    depreciationTrend,
    depreciationMethod,
    capexAdditions,
    capexDisposals,
    netCapex,
    eligibleCollateral,
    collateralHaircut,
  };
}

// Generate customer-specific tax obligations data
export function generateTaxObligationsData(
  customerSlug: string
): TaxObligationsData {
  const seed = hashCode(customerSlug);
  const random = (offset: number = 0) => seededRandom(seed + offset);

  // Get revenue from income/expenses data
  const incomeData = generateIncomeExpensesData(customerSlug);
  const revenue = incomeData.revenue;

  // Calculate Total Tax Payables: typically 5-15% of annual revenue for SMEs
  const taxPayablesRatio = 0.05 + random(600) * 0.1; // 5-15%
  const totalTaxPayables = revenue * taxPayablesRatio;

  // Generate YoY change for total tax payables (-10% to +15%)
  const totalTaxPayablesChange = Math.floor(random(601) * 26 - 10);
  const totalTaxPayablesTrend: "up" | "down" =
    totalTaxPayablesChange >= 0 ? "up" : "down";

  // Calculate VAT amounts
  // VAT Output: typically 10-20% of revenue (assuming 19% VAT rate on ~50-100% of revenue)
  const vatOutputRatio = 0.1 + random(602) * 0.1; // 10-20%
  const vatOutput = revenue * vatOutputRatio;

  // VAT Input: typically 8-18% of revenue (businesses claim back VAT on purchases)
  const vatInputRatio = 0.08 + random(603) * 0.1; // 8-18%
  const vatInput = revenue * vatInputRatio;

  // Calculate net VAT
  const vatNet = vatOutput - vatInput;
  const vatPosition: "payable" | "receivable" =
    vatNet >= 0 ? "payable" : "receivable";

  // Generate VAT due date (typically 20 days after period end, so around Dec 20, 2025)
  const vatDueDate = "2025-12-20"; // Simplified - could be calculated dynamically

  // Calculate Payroll Taxes Due: typically 2-5% of revenue
  const payrollTaxesRatio = 0.02 + random(604) * 0.03; // 2-5%
  const payrollTaxesDue = revenue * payrollTaxesRatio;

  // Generate payroll cycle label (current month-year format)
  const currentDate = new Date();
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const currentMonth = months[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();
  const payrollCycleLabel = `${currentMonth}-${currentYear}`;

  // Generate days left until payroll due date (typically 5-25 days)
  const payrollDaysLeft = 5 + Math.floor(random(605) * 21); // 5-25 days

  // Generate filing compliance status
  const filingStatus: "up-to-date" | "overdue" =
    random(606) > 0.2 ? "up-to-date" : "overdue"; // 80% chance of up-to-date

  // Generate filing counts for last 12 months
  const filingTotalL12M = 12; // Typically 12 filings per year (monthly)
  const filingOnTimeL12M =
    filingStatus === "up-to-date"
      ? filingTotalL12M - Math.floor(random(607) * 2) // 11-12 if up-to-date
      : filingTotalL12M - Math.floor(random(607) * 4) - 1; // 7-10 if overdue

  return {
    totalTaxPayables,
    totalTaxPayablesChange,
    totalTaxPayablesTrend,
    vatOutput,
    vatInput,
    vatNet,
    vatPosition,
    vatDueDate,
    payrollTaxesDue,
    payrollCycleLabel,
    payrollDaysLeft,
    filingStatus,
    filingOnTimeL12M,
    filingTotalL12M,
  };
}

// Generate customer-specific sales data
export function generateCustomerSalesData(
  customerSlug: string
): CustomerSalesData[] {
  const seed = hashCode(customerSlug);
  const months = [
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
  ];

  // Base scale for this customer
  const baseScale =
    (150000 + seededRandom(seed) * 300000) * FINANCIAL_SCALE_FACTOR; // 150k-450k range
  const volatility = 0.2 + seededRandom(seed + 1) * 0.3; // 20-50% volatility

  return months.map((month, index) => {
    const random1 = seededRandom(seed + index * 10);
    const random2 = seededRandom(seed + index * 10 + 1);
    const random3 = seededRandom(seed + index * 10 + 2);
    const random4 = seededRandom(seed + index * 10 + 3);

    // Generate trending data with some seasonal patterns
    const trend = 0.8 + index * 0.05 + Math.sin(index * 0.5) * 0.2;
    const sales = Math.floor(
      baseScale * trend * (1 + (random1 - 0.5) * volatility)
    );
    const cashFlow = Math.floor(sales * (0.4 + random2 * 0.3)); // 40-70% of sales
    const revenue = Math.floor(sales * (0.85 + random3 * 0.1)); // 85-95% of sales
    const expenses = Math.floor(sales * (0.3 + random4 * 0.4)); // 30-70% of sales

    return {
      month,
      sales: Math.max(sales, Math.floor(50000 * FINANCIAL_SCALE_FACTOR)), // Minimum 50k scaled
      cashFlow: Math.max(cashFlow, Math.floor(20000 * FINANCIAL_SCALE_FACTOR)), // Minimum 20k scaled
      revenue: Math.max(revenue, Math.floor(40000 * FINANCIAL_SCALE_FACTOR)), // Minimum 40k scaled
      expenses: Math.max(expenses, Math.floor(30000 * FINANCIAL_SCALE_FACTOR)), // Minimum 30k scaled
    };
  });
}

// Generate customer-specific AR/AP data
export function generateCustomerARAPData(
  customerSlug: string
): CustomerARAPData[] {
  const seed = hashCode(customerSlug);
  const months = [
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
  ];

  // Target totals
  const arTarget = 645349;
  const apTarget = 367729;

  // Base pattern for AR (similar to sales pattern)
  const arPattern = [200000, 180000, 350000, 360000, 340000, 320000, 300000, 280000, 260000];
  // Base pattern for AP (similar to cashFlow pattern)
  const apPattern = [150000, 120000, 180000, 160000, 170000, 150000, 100000, 120000, 180000];

  // Calculate scaling factors
  const arPatternSum = arPattern.reduce((a, b) => a + b, 0);
  const apPatternSum = apPattern.reduce((a, b) => a + b, 0);

  const arScale = arTarget / arPatternSum;
  const apScale = apTarget / apPatternSum;

  // Generate base values with customer-specific variation
  const customerVariation = 0.1 + seededRandom(seed) * 0.2; // 10-30% variation
  const arVolatility = 0.15 + seededRandom(seed + 1) * 0.15; // 15-30% volatility
  const apVolatility = 0.15 + seededRandom(seed + 2) * 0.15; // 15-30% volatility

  let arValues = arPattern.map((base, index) => {
    const random = seededRandom(seed + index * 10);
    const trend = 0.8 + index * 0.05 + Math.sin(index * 0.5) * 0.2;
    const variation = 1 + (random - 0.5) * arVolatility;
    return Math.round(base * arScale * trend * variation * (1 + (customerVariation - 0.15)));
  });

  let apValues = apPattern.map((base, index) => {
    const random = seededRandom(seed + index * 10 + 100);
    const trend = 0.9 + index * 0.03 + Math.sin(index * 0.6) * 0.15;
    const variation = 1 + (random - 0.5) * apVolatility;
    return Math.round(base * apScale * trend * variation * (1 + (customerVariation - 0.15)));
  });

  // Adjust to exact totals
  const arCurrent = arValues.reduce((a, b) => a + b, 0);
  const apCurrent = apValues.reduce((a, b) => a + b, 0);

  const arDiff = arTarget - arCurrent;
  const apDiff = apTarget - apCurrent;

  // Distribute difference proportionally
  arValues = arValues.map((val, i) => {
    const proportion = arPattern[i] / arPatternSum;
    return val + Math.round(arDiff * proportion);
  });

  apValues = apValues.map((val, i) => {
    const proportion = apPattern[i] / apPatternSum;
    return val + Math.round(apDiff * proportion);
  });

  // Final adjustment to ensure exact totals
  const arFinalSum = arValues.reduce((a, b) => a + b, 0);
  const apFinalSum = apValues.reduce((a, b) => a + b, 0);

  arValues[arValues.length - 1] += (arTarget - arFinalSum);
  apValues[apValues.length - 1] += (apTarget - apFinalSum);

  return months.map((month, index) => ({
    month,
    ar: arValues[index],
    ap: apValues[index],
  }));
}

// Generate customer concentration data
export function generateCustomerConcentration(
  customerSlug: string
): CustomerConcentration {
  const seed = hashCode(customerSlug);
  const random = seededRandom(seed + 100);

  // Generate realistic concentration percentage (30-70%)
  const percentage = Math.floor(30 + random * 40);

  return {
    topCustomersPercentage: percentage,
  };
}

// Get customer business sector for context
export function getCustomerSector(customerSlug: string): string {
  const sectorMap: Record<string, string> = {
    "euromed-supplies-gmbh": "Pharmaceutical & Medical Supplies",
    "techflow-electronics-bv": "Electronics and Appliances",
    "nordic-construction-partners-as": "Construction Materials",
    "medicare-pharmaceuticals-sa": "Pharmaceutical & Medical Supplies",
    "alpine-gourmet-distributors-gmbh": "Food & Beverages Wholesale",
  };

  return sectorMap[customerSlug] || "General Business";
}

// BankTransaction interface for transaction data
export interface BankTransaction {
  id: string;
  date: string; // ISO date
  account: string;
  description: string;
  amountEur: number; // positive for credit, negative for debit
  category: "income" | "expense" | "transfer" | "cancelled";
}

// Generate realistic transaction data for a customer
export function generateCustomerTransactions(
  customerSlug: string,
  months: number = 12
): BankTransaction[] {
  const seed = hashCode(customerSlug);
  const random = (offset: number = 0) => seededRandom(seed + offset);

  // Get customer revenue data to base transaction amounts on
  const plData = generateCustomerPLData(customerSlug);
  const annualRevenue = plData.totalRevenue;
  const monthlyRevenue = annualRevenue / 12;
  const monthlyExpenses = plData.totalExpenses / 12;

  // Generate account numbers (deterministic based on customer)
  const account1 = `GR12 0110 0120 0000 0001 2300 ${(seed % 1000)
    .toString()
    .padStart(3, "0")}`;
  const account2 = `GR45 0171 0120 0000 0009 8765 ${((seed + 100) % 1000)
    .toString()
    .padStart(3, "0")}`;

  const transactions: BankTransaction[] = [];
  const now = new Date();
  let transactionId = 1;

  // Generate transactions for the last N months
  for (let monthOffset = months - 1; monthOffset >= 0; monthOffset--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    // Calculate base amounts for this month with some variation
    const monthVariation = 0.8 + random(monthOffset * 100) * 0.4; // 80-120% variation
    const monthRevenue = monthlyRevenue * monthVariation;
    const monthExpenses = monthlyExpenses * monthVariation;

    // Income transactions (customer payments, invoices)
    // Typically 3-8 income transactions per month for SMEs
    const numIncomeTransactions = 3 + Math.floor(random(monthOffset * 10 + 1) * 6);
    const incomePerTransaction = monthRevenue / numIncomeTransactions;

    for (let i = 0; i < numIncomeTransactions; i++) {
      const day = 1 + Math.floor(random(monthOffset * 10 + i + 2) * 28);
      const variation = 0.7 + random(monthOffset * 10 + i + 3) * 0.6; // 70-130% variation
      const amount = incomePerTransaction * variation;

      const descriptions = [
        `Wire - Customer Invoice #${1800 + Math.floor(random(monthOffset * 10 + i + 4) * 200)}`,
        `SEPA - Payment from Customer`,
        `Bank Transfer - Invoice Payment`,
        `Customer Payment - Invoice #${1900 + Math.floor(random(monthOffset * 10 + i + 5) * 100)}`,
        `Payment Received - Order #${2000 + Math.floor(random(monthOffset * 10 + i + 6) * 500)}`,
      ];

      transactions.push({
        id: `t${transactionId++}`,
        date: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        account: account1,
        description:
          descriptions[Math.floor(random(monthOffset * 10 + i + 7) * descriptions.length)],
        amountEur: Math.round(amount * 100) / 100,
        category: "income",
      });
    }

    // Expense transactions
    // Payroll (typically 1-2 per month)
    const payrollDay = 25 + Math.floor(random(monthOffset * 20 + 10) * 5); // 25-30th
    const payrollAmount = monthExpenses * (0.35 + random(monthOffset * 20 + 11) * 0.1); // 35-45% of expenses
    transactions.push({
      id: `t${transactionId++}`,
      date: `${year}-${String(month + 1).padStart(2, "0")}-${String(Math.min(payrollDay, 28)).padStart(2, "0")}`,
      account: account1,
      description: "SEPA - Payroll Batch",
      amountEur: -Math.round(payrollAmount * 100) / 100,
      category: "expense",
    });

    // Rent (typically 1 per month, around day 1-5)
    const rentDay = 1 + Math.floor(random(monthOffset * 20 + 12) * 5);
    const rentAmount = monthExpenses * (0.12 + random(monthOffset * 20 + 13) * 0.08); // 12-20% of expenses
    transactions.push({
      id: `t${transactionId++}`,
      date: `${year}-${String(month + 1).padStart(2, "0")}-${String(rentDay).padStart(2, "0")}`,
      account: account2,
      description: "Rent - HQ",
      amountEur: -Math.round(rentAmount * 100) / 100,
      category: "expense",
    });

    // Utilities (1-2 per month)
    const utilitiesDay = 10 + Math.floor(random(monthOffset * 20 + 14) * 15);
    const utilitiesAmount = monthExpenses * (0.03 + random(monthOffset * 20 + 15) * 0.04); // 3-7% of expenses
    transactions.push({
      id: `t${transactionId++}`,
      date: `${year}-${String(month + 1).padStart(2, "0")}-${String(utilitiesDay).padStart(2, "0")}`,
      account: account1,
      description: "Utilities - Electricity",
      amountEur: -Math.round(utilitiesAmount * 100) / 100,
      category: "expense",
    });

    // Office supplies and other expenses (2-5 per month)
    const numOtherExpenses = 2 + Math.floor(random(monthOffset * 20 + 16) * 4);
    const otherExpensesAmount = monthExpenses * (0.15 + random(monthOffset * 20 + 17) * 0.15); // 15-30% of expenses
    const expensePerTransaction = otherExpensesAmount / numOtherExpenses;

    const expenseDescriptions = [
      "Card purchase - Office Supplies",
      "Card purchase - Fuel",
      "Insurance Premium",
      "Professional Services",
      "Marketing Expenses",
      "Software Subscription",
      "Maintenance & Repairs",
    ];

    for (let i = 0; i < numOtherExpenses; i++) {
      const day = 5 + Math.floor(random(monthOffset * 20 + 18 + i) * 25);
      const variation = 0.5 + random(monthOffset * 20 + 19 + i) * 1.0; // 50-150% variation
      const amount = expensePerTransaction * variation;

      transactions.push({
        id: `t${transactionId++}`,
        date: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        account: account1,
        description:
          expenseDescriptions[
            Math.floor(random(monthOffset * 20 + 20 + i) * expenseDescriptions.length)
          ],
        amountEur: -Math.round(amount * 100) / 100,
        category: "expense",
      });
    }

    // Tax payments (quarterly, typically in months 3, 6, 9, 12)
    if ((month + 1) % 3 === 0) {
      const taxDay = 15 + Math.floor(random(monthOffset * 20 + 30) * 10);
      const taxAmount = monthExpenses * (0.08 + random(monthOffset * 20 + 31) * 0.07); // 8-15% of expenses
      transactions.push({
        id: `t${transactionId++}`,
        date: `${year}-${String(month + 1).padStart(2, "0")}-${String(taxDay).padStart(2, "0")}`,
        account: account1,
        description: "Tax Payment - VAT",
        amountEur: -Math.round(taxAmount * 100) / 100,
        category: "expense",
      });
    }

    // Occasional transfers between accounts (1-2 per month)
    if (random(monthOffset * 20 + 40) > 0.5) {
      const transferDay = 10 + Math.floor(random(monthOffset * 20 + 41) * 20);
      const transferAmount = monthlyRevenue * (0.1 + random(monthOffset * 20 + 42) * 0.2); // 10-30% of revenue

      transactions.push({
        id: `t${transactionId++}`,
        date: `${year}-${String(month + 1).padStart(2, "0")}-${String(transferDay).padStart(2, "0")}`,
        account: account1,
        description: "Bank Transfer between accounts",
        amountEur: -Math.round(transferAmount * 100) / 100,
        category: "transfer",
      });

      transactions.push({
        id: `t${transactionId++}`,
        date: `${year}-${String(month + 1).padStart(2, "0")}-${String(transferDay).padStart(2, "0")}`,
        account: account2,
        description: "Bank Transfer between accounts",
        amountEur: Math.round(transferAmount * 100) / 100,
        category: "transfer",
      });
    }
  }

  // Sort by date descending (most recent first)
  return transactions.sort((a, b) => b.date.localeCompare(a.date));
}

// Calculate average monthly cash flow from transactions
export function calculateAverageMonthlyCashFlow(
  transactions: BankTransaction[]
): number {
  // Filter out transfers and cancelled transactions
  const validTransactions = transactions.filter(
    (t) => t.category !== "transfer" && t.category !== "cancelled"
  );

  // Group transactions by month
  const monthlyCashFlows: Record<string, number> = {};

  validTransactions.forEach((transaction) => {
    const monthKey = transaction.date.substring(0, 7); // YYYY-MM
    if (!monthlyCashFlows[monthKey]) {
      monthlyCashFlows[monthKey] = 0;
    }
    monthlyCashFlows[monthKey] += transaction.amountEur;
  });

  // Calculate average
  const months = Object.keys(monthlyCashFlows);
  if (months.length === 0) return 0;

  const totalCashFlow = months.reduce((sum, month) => sum + monthlyCashFlows[month], 0);
  return totalCashFlow / months.length;
}

// Calculate cash flow volatility (coefficient of variation as percentage)
export function calculateCashFlowVolatility(
  transactions: BankTransaction[]
): number {
  // Filter out transfers and cancelled transactions
  const validTransactions = transactions.filter(
    (t) => t.category !== "transfer" && t.category !== "cancelled"
  );

  // Group transactions by month
  const monthlyCashFlows: Record<string, number> = {};

  validTransactions.forEach((transaction) => {
    const monthKey = transaction.date.substring(0, 7); // YYYY-MM
    if (!monthlyCashFlows[monthKey]) {
      monthlyCashFlows[monthKey] = 0;
    }
    monthlyCashFlows[monthKey] += transaction.amountEur;
  });

  const months = Object.keys(monthlyCashFlows);
  if (months.length === 0) return 0;

  const cashFlowValues = months.map((month) => monthlyCashFlows[month]);

  // Calculate mean
  const mean = cashFlowValues.reduce((sum, val) => sum + val, 0) / cashFlowValues.length;

  // If mean is zero or very small, return a default volatility
  if (Math.abs(mean) < 0.01) {
    return 25.0; // Default volatility for micro/small businesses
  }

  // Calculate standard deviation
  const variance =
    cashFlowValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    cashFlowValues.length;
  const stdDev = Math.sqrt(variance);

  // Calculate coefficient of variation as percentage
  const coefficientOfVariation = (stdDev / Math.abs(mean)) * 100;

  // Ensure realistic range for micro/small European businesses (15-40%)
  // Clamp to this range if outside
  return Math.max(15, Math.min(40, coefficientOfVariation));
}
