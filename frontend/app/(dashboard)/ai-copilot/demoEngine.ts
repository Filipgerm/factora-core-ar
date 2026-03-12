import type { ChatMessage, FullReport, ChartSpec, ReportMetric } from "@/types/chat";

// Seeded random number generator for deterministic results
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

const rng = new SeededRandom(44);

// Generate consistent demo metrics
const generateMetrics = (): Record<string, { value: string; trend: "up" | "down" | "flat"; notes: string }> => {
  const dso = Math.round(rng.range(48, 60));
  const dpo = Math.round(rng.range(41, 53));
  const dio = Math.round(rng.range(30, 46));
  const ccc = dso + dio - dpo;
  
  return {
    cash_runway: {
      value: `${rng.range(5, 8).toFixed(1)} months`,
      trend: "flat",
      notes: "Months until cash reaches 0 assuming projected net burn. Runway = Cash / Monthly Net Outflow."
    },
    current_ratio: {
      value: rng.range(1.1, 1.6).toFixed(2),
      trend: "up",
      notes: "(Cash + AR + Inventories + Other Current Assets) / (AP + Short-term Debt + Other Current Liabilities)"
    },
    dso: {
      value: `${dso} days`,
      trend: "down",
      notes: "Average days to collect receivables. DSO = (AR / Credit Sales) × days."
    },
    dpo: {
      value: `${dpo} days`,
      trend: "up",
      notes: "Average days to pay suppliers. DPO = (AP / COGS or Purchases) × days."
    },
    dio: {
      value: `${dio} days`,
      trend: "flat",
      notes: "Average days inventory stays on hand. DIO = (Inventory / COGS) × days."
    },
    ccc: {
      value: `${ccc} days`,
      trend: ccc > 40 ? "down" : "up",
      notes: "CCC = DSO + DIO − DPO (lower is better). Measures how long cash is tied up in operations."
    },
    collection_consistency: {
      value: `${Math.round(rng.range(88, 96))}%`,
      trend: "up",
      notes: "Share of invoices collected within stated terms (e.g., 'Net 30') over a rolling window."
    },
    ar_aging_0_30: {
      value: `€${Math.round(rng.range(180, 220))}k`,
      trend: "flat",
      notes: "Accounts receivable aged 0-30 days"
    },
    ar_aging_31_60: {
      value: `€${Math.round(rng.range(45, 65))}k`,
      trend: "down",
      notes: "Accounts receivable aged 31-60 days"
    },
    ar_aging_61_90: {
      value: `€${Math.round(rng.range(15, 25))}k`,
      trend: "down",
      notes: "Accounts receivable aged 61-90 days"
    },
    ar_aging_90_plus: {
      value: `€${Math.round(rng.range(8, 15))}k`,
      trend: "flat",
      notes: "Accounts receivable aged 90+ days"
    },
    ap_aging_0_30: {
      value: `€${Math.round(rng.range(160, 190))}k`,
      trend: "flat",
      notes: "Accounts payable aged 0-30 days"
    },
    ap_aging_31_60: {
      value: `€${Math.round(rng.range(35, 55))}k`,
      trend: "up",
      notes: "Accounts payable aged 31-60 days"
    },
    ap_aging_61_90: {
      value: `€${Math.round(rng.range(12, 22))}k`,
      trend: "down",
      notes: "Accounts payable aged 61-90 days"
    },
    ap_aging_90_plus: {
      value: `€${Math.round(rng.range(5, 12))}k`,
      trend: "down",
      notes: "Accounts payable aged 90+ days"
    },
    overdue_collections: {
      value: `${rng.range(6, 12).toFixed(1)}%`,
      trend: "down",
      notes: "Overdue / Total AR"
    },
    overdue_payments: {
      value: `${rng.range(4, 9).toFixed(1)}%`,
      trend: "flat",
      notes: "Overdue / Total AP"
    },
    recovery_rate: {
      value: `${Math.round(rng.range(78, 88))}%`,
      trend: "up",
      notes: "Recovered overdue € / Total past-due €"
    },
    vat_forecast: {
      value: `€${Math.round(rng.range(48, 68))}k`,
      trend: "flat",
      notes: "VAT payable = Output VAT − Input VAT (sales × rate − purchases × rate)"
    },
    payroll_taxes: {
      value: `€${Math.round(rng.range(35, 52))}k`,
      trend: "flat",
      notes: "Employer/employee social security contributions due next month"
    },
    bank_fees_pct: {
      value: `${rng.range(0.7, 1.2).toFixed(2)}%`,
      trend: "flat",
      notes: "Bank fees / Collections"
    },
    cost_of_financing: {
      value: `${rng.range(6, 10).toFixed(1)}%`,
      trend: "down",
      notes: "(Avg debt × APR) / 12 months"
    },
    return_rate: {
      value: `${rng.range(4, 9).toFixed(1)}%`,
      trend: "up",
      notes: "Net Income / Revenue (monthly proxy)"
    },
    risk_signals: {
      value: "2 signals",
      trend: "down",
      notes: "Bounced check (1), Invoice dispute (1)"
    },
    auto_matching_pct: {
      value: `${Math.round(rng.range(82, 92))}%`,
      trend: "up",
      notes: "Autoreconciled payments / total payments"
    },
    reconciliation_days: {
      value: `${rng.range(1.2, 2.8).toFixed(1)} days`,
      trend: "down",
      notes: "Avg time to match transactions to invoices"
    },
    dispute_rate: {
      value: `${rng.range(0.5, 1.5).toFixed(1)}%`,
      trend: "flat",
      notes: "Disputed invoices / total invoices"
    },
    scenario_dso_10_dpo_10: {
      value: `${ccc + 20} days`,
      trend: "down",
      notes: `CCC' = (DSO+10) + DIO − (DPO−10) = ${dso + 10} + ${dio} − ${dpo - 10}`
    }
  };
};

const metrics = generateMetrics();

// Generate 13-week forecast data
const generate13WeekForecast = (): ChartSpec["data"] => {
  const data: ChartSpec["data"] = [];
  let opening = rng.range(280000, 320000);
  
  for (let i = 1; i <= 13; i++) {
    const seasonalityFactor = i % 4 === 0 ? 1.1 : 1.0;
    const inflows = rng.range(75000, 95000) * seasonalityFactor;
    const outflows = rng.range(70000, 90000) * seasonalityFactor;
    const net = inflows - outflows;
    const closing = opening + net;
    
    data.push({
      week: `Wk ${String(i).padStart(2, '0')}`,
      opening: Math.round(opening),
      inflows: Math.round(inflows),
      outflows: Math.round(outflows),
      net: Math.round(net),
      closing: Math.round(closing)
    });
    
    opening = closing;
  }
  
  return data;
};

// Build full report with all metrics
const buildFullReport = (): FullReport => {
  const allMetrics: ReportMetric[] = [
    // Liquidity
    { group: "Liquidity", key: "cash_runway", label: "Cash Runway", ...metrics.cash_runway },
    { group: "Liquidity", key: "current_ratio", label: "Current Ratio (proxy)", ...metrics.current_ratio },
    
    // Working Capital Efficiency
    { group: "Working Capital Efficiency", key: "dso", label: "DSO (Days Sales Outstanding)", ...metrics.dso },
    { group: "Working Capital Efficiency", key: "dpo", label: "DPO (Days Payable Outstanding)", ...metrics.dpo },
    { group: "Working Capital Efficiency", key: "dio", label: "DIO (Days Inventory Outstanding)", ...metrics.dio },
    { group: "Working Capital Efficiency", key: "ccc", label: "Cash Conversion Cycle (CCC)", ...metrics.ccc },
    
    // Collections & Payments Discipline
    { group: "Collections & Payments Discipline", key: "collection_consistency", label: "Collection consistency vs credit terms", ...metrics.collection_consistency },
    { group: "Collections & Payments Discipline", key: "ar_aging_0_30", label: "AR Aging: 0–30 days", ...metrics.ar_aging_0_30 },
    { group: "Collections & Payments Discipline", key: "ar_aging_31_60", label: "AR Aging: 31–60 days", ...metrics.ar_aging_31_60 },
    { group: "Collections & Payments Discipline", key: "ar_aging_61_90", label: "AR Aging: 61–90 days", ...metrics.ar_aging_61_90 },
    { group: "Collections & Payments Discipline", key: "ar_aging_90_plus", label: "AR Aging: 90+ days", ...metrics.ar_aging_90_plus },
    { group: "Collections & Payments Discipline", key: "ap_aging_0_30", label: "AP Aging: 0–30 days", ...metrics.ap_aging_0_30 },
    { group: "Collections & Payments Discipline", key: "ap_aging_31_60", label: "AP Aging: 31–60 days", ...metrics.ap_aging_31_60 },
    { group: "Collections & Payments Discipline", key: "ap_aging_61_90", label: "AP Aging: 61–90 days", ...metrics.ap_aging_61_90 },
    { group: "Collections & Payments Discipline", key: "ap_aging_90_plus", label: "AP Aging: 90+ days", ...metrics.ap_aging_90_plus },
    { group: "Collections & Payments Discipline", key: "overdue_collections", label: "% of overdue collections", ...metrics.overdue_collections },
    { group: "Collections & Payments Discipline", key: "overdue_payments", label: "% of overdue payments", ...metrics.overdue_payments },
    { group: "Collections & Payments Discipline", key: "recovery_rate", label: "Recovery rate of past-due amounts", ...metrics.recovery_rate },
    
    // Taxes & Statutory
    { group: "Taxes & Statutory", key: "vat_forecast", label: "Forecast VAT payable/receivable", ...metrics.vat_forecast },
    { group: "Taxes & Statutory", key: "payroll_taxes", label: "Payroll taxes / next month's social security", ...metrics.payroll_taxes },
    
    // Costs & Returns
    { group: "Costs & Returns", key: "bank_fees_pct", label: "Bank fees as % of collections", ...metrics.bank_fees_pct },
    { group: "Costs & Returns", key: "cost_of_financing", label: "Cost of financing", ...metrics.cost_of_financing },
    { group: "Costs & Returns", key: "return_rate", label: "Return rate (monthly proxy)", ...metrics.return_rate },
    
    // Risk Signals
    { group: "Risk Signals", key: "risk_signals", label: "Risk signals", ...metrics.risk_signals },
    
    // Forecasts & Scenarios
    { group: "Forecasts & Scenarios", key: "forecast_13week", label: "13-week cash flow forecast", value: "See chart below", trend: "flat", notes: "Interactive forecast with seasonality assumptions" },
    { group: "Forecasts & Scenarios", key: "scenario_dso_10_dpo_10", label: "DSO +10 / DPO −10 scenario", ...metrics.scenario_dso_10_dpo_10 },
  ];
  
  return {
    title: "Financial Health Report",
    asOf: new Date().toISOString(),
    metrics: allMetrics
  };
};

// Intent detection and response generation
export const answer = (query: string, entitySelected: boolean): ChatMessage => {
  const q = query.toLowerCase();
  
  // Entity confirmation needed
  if (!entitySelected) {
    return {
      role: "assistant",
      content: "I'll analyze the financial health of your business. First, let me confirm the entity details:",
      entityCard: {
        name: "T.E.M.A A.E.",
        distinctiveTitle: "T.E.M.A A.E.",
        gemi: "030783729000",
        euid: "ELGEMI.030783729000",
        vat: "099532515",
        legalForm: "AE",
        incorporationDate: "18/09/2000",
        address: "ΒΟΡΕΙΟΥ ΗΠΕΙΡΟΥ 24, …",
        website: "www.kaminaris-sa.gr",
        eShop: "No data found",
        status: "Active"
      }
    };
  }
  
  // Full report request
  if (q.includes("full report") || q.includes("financial health report") || q.includes("all metrics") || q.includes("complete picture")) {
    return {
      role: "assistant",
      content: "Here's your complete Financial Health Report with all key metrics:",
      fullReport: buildFullReport()
    };
  }
  
  // 13-week forecast
  if (q.includes("13") && (q.includes("week") || q.includes("forecast") || q.includes("cash flow"))) {
    const forecastData = generate13WeekForecast();
    const minClosing = Math.min(...forecastData.map(d => d.closing));
    const minWeek = forecastData.find(d => d.closing === minClosing);
    
    return {
      role: "assistant",
      content: `Here's your 13-week cash flow forecast. Low point in ${minWeek?.week} at €${Math.round(minClosing / 1000)}k.`,
      chart: {
        kind: "13week-cf",
        title: "13-Week Cash Flow Forecast",
        data: forecastData,
        currency: "€"
      }
    };
  }
  
  // Single metric queries
  const metricMap: Record<string, { key: string; label: string; explanation?: string }> = {
    dpo: { 
      key: "dpo", 
      label: "DPO",
      explanation: "DPO (Days Payable Outstanding) measures the average number of days your business takes to pay suppliers. A higher DPO means you're taking longer to pay, which can improve cash flow but may strain supplier relationships. Your DPO is calculated as (Accounts Payable / Cost of Goods Sold) × days in period."
    },
    dso: { 
      key: "dso", 
      label: "DSO",
      explanation: "DSO (Days Sales Outstanding) measures how long it takes to collect payment after a sale. Lower is better. Your DSO is calculated as (Accounts Receivable / Credit Sales) × days in period."
    },
    dio: { 
      key: "dio", 
      label: "DIO",
      explanation: "DIO (Days Inventory Outstanding) measures how long inventory stays on hand before being sold. Lower typically indicates efficient inventory management. Calculated as (Inventory / Cost of Goods Sold) × days."
    },
    ccc: { 
      key: "ccc", 
      label: "Cash Conversion Cycle",
      explanation: "CCC = DSO + DIO − DPO. It's how long cash is tied up in operations before you get it back. Lower is better because it means cash returns faster to your business."
    },
    "cash runway": { key: "cash_runway", label: "Cash Runway" },
    "current ratio": { key: "current_ratio", label: "Current Ratio" },
    "ar aging": { key: "ar_aging_0_30", label: "AR Aging" },
    "ap aging": { key: "ap_aging_0_30", label: "AP Aging" },
    "overdue": { key: "overdue_collections", label: "Overdue Collections" },
    "recovery": { key: "recovery_rate", label: "Recovery Rate" },
    "vat": { key: "vat_forecast", label: "VAT Forecast" },
    "payroll": { key: "payroll_taxes", label: "Payroll Taxes" },
    "bank fees": { key: "bank_fees_pct", label: "Bank Fees %" },
    "financing": { key: "cost_of_financing", label: "Cost of Financing" },
    "return": { key: "return_rate", label: "Return Rate" },
    "risk": { key: "risk_signals", label: "Risk Signals" },
    "reconciliation": { key: "reconciliation_days", label: "Reconciliation Days" },
    "dispute": { key: "dispute_rate", label: "Dispute Rate" },
  };
  
  for (const [keyword, { key, label, explanation }] of Object.entries(metricMap)) {
    if (q.includes(keyword)) {
      const metric = metrics[key];
      const needsExplanation = q.includes("explain") || q.includes("what is") || q.includes("tell me about");
      
      return {
        role: "assistant",
        content: `Your ${label} is ${metric.value} ${metric.trend === "up" ? "▲" : metric.trend === "down" ? "▼" : "•"} (vs last month). As of ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`,
        explanationHtml: needsExplanation && explanation ? `<div class="text-sm text-muted-foreground mt-2 p-3 bg-muted/50 rounded-md">${explanation}</div>` : undefined
      };
    }
  }
  
  // Working capital picture
  if (q.includes("working capital") || (q.includes("cash") && q.includes("cycle"))) {
    return {
      role: "assistant",
      content: `Here's your working capital picture:\n\n• DSO: ${metrics.dso.value}\n• DPO: ${metrics.dpo.value}\n• DIO: ${metrics.dio.value}\n• CCC: ${metrics.ccc.value}\n• AR 0-30: ${metrics.ar_aging_0_30.value}\n• AP 0-30: ${metrics.ap_aging_0_30.value}\n\nYour cash conversion cycle is ${metrics.ccc.value}, meaning it takes that long for cash to return to your business after being invested in operations.`
    };
  }
  
  // Default
  return {
    role: "assistant",
    content: "I can help you with financial metrics. Try asking about DSO, DPO, cash runway, or request a 'full report' or '13-week forecast'."
  };
};
