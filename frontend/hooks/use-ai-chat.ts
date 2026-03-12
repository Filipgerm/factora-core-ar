"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatMessage, FullReport, ChartSpec } from "@/types/chat";

export function useAIChat() {
  const [chatStarted, setChatStarted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [entitySelected, setEntitySelected] = useState(false);

  // Format current date/time for the adverse records footer
  const formatCurrentTimestamp = () => {
    const now = new Date();
    const formatted = now
      .toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace(",", "");
    return formatted;
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isThinking]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  const buildEntityCardMessage = (): ChatMessage => ({
    role: "assistant",
    content: "Please verify this is the correct entity:",
    entityCard: {
      name: "T.E.S.T S.A.",
      distinctiveTitle: "T.E.S.T S.A.",
      gemi: "030235221000",
      euid: "ELGEMI.030235221000",
      vat: "099999999",
      legalForm: "SA",
      incorporationDate: "18/09/2000",
      address: "Test Str 24, …",
      website: "www.test-sa.gr",
      eShop: "No data found",
      status: "Active",
    },
  });

  const buildDemoFullReport = (): FullReport => ({
    title: "Financial Health Report",
    asOf: new Date().toISOString(),
    metrics: [
      // Liquidity
      {
        group: "Liquidity",
        key: "cash_runway",
        label: "Cash Runway",
        value: "6.4 months",
        notes: "Cash / Monthly Net Outflow",
        trend: "up",
      },
      {
        group: "Liquidity",
        key: "cash_volatility_index",
        label: "Cash Volatility Index",
        value: "0.82",
        notes: "Standard deviation of daily cash flows over 90 days",
        trend: "flat",
      },
      // Working Capital Efficiency
      {
        group: "Working Capital Efficiency",
        key: "dso",
        label: "DSO",
        value: "52 days",
        trend: "down",
      },
      {
        group: "Working Capital Efficiency",
        key: "dpo",
        label: "DPO",
        value: "49 days",
        trend: "up",
      },
      {
        group: "Working Capital Efficiency",
        key: "dio",
        label: "DIO",
        value: "36 days",
        trend: "down",
      },
      {
        group: "Working Capital Efficiency",
        key: "ccc",
        label: "Cash Conversion Cycle (CCC)",
        value: "39 days",
        notes: "DSO + DIO − DPO",
        trend: "down",
      },
      {
        group: "Working Capital Efficiency",
        key: "avg_customer_credit_terms",
        label: "Avg. Customer Credit Terms",
        value: "32 days",
        notes: "Average payment terms offered to customers",
        trend: "flat",
      },
      {
        group: "Working Capital Efficiency",
        key: "avg_supplier_credit_terms",
        label: "Avg. Supplier Credit Terms",
        value: "28 days",
        notes: "Average payment terms received from suppliers",
        trend: "up",
      },
      // Collections & Payments Discipline
      {
        group: "Collections & Payments Discipline",
        key: "ar_aging_0_30",
        label: "AR Aging: 0–30 days",
        value: "€142k",
        trend: "flat",
        notes: "Accounts receivable aged 0-30 days"
      },
      {
        group: "Collections & Payments Discipline",
        key: "ar_aging_31_60",
        label: "AR Aging: 31–60 days",
        value: "€61k",
        trend: "down",
        notes: "Accounts receivable aged 31-60 days"
      },
      {
        group: "Collections & Payments Discipline",
        key: "ar_aging_61_90",
        label: "AR Aging: 61–90 days",
        value: "€18k",
        trend: "down",
        notes: "Accounts receivable aged 61-90 days"
      },
      {
        group: "Collections & Payments Discipline",
        key: "ar_aging_90_plus",
        label: "AR Aging: 90+ days",
        value: "€9k",
        trend: "flat",
        notes: "Accounts receivable aged 90+ days"
      },
      {
        group: "Collections & Payments Discipline",
        key: "ap_aging_0_30",
        label: "AP Aging: 0–30 days",
        value: "€117k",
        trend: "flat",
        notes: "Accounts payable aged 0-30 days"
      },
      {
        group: "Collections & Payments Discipline",
        key: "ap_aging_31_60",
        label: "AP Aging: 31–60 days",
        value: "€43k",
        trend: "up",
        notes: "Accounts payable aged 31-60 days"
      },
      {
        group: "Collections & Payments Discipline",
        key: "ap_aging_61_90",
        label: "AP Aging: 61–90 days",
        value: "€12k",
        trend: "down",
        notes: "Accounts payable aged 61-90 days"
      },
      {
        group: "Collections & Payments Discipline",
        key: "ap_aging_90_plus",
        label: "AP Aging: 90+ days",
        value: "€4k",
        trend: "down",
        notes: "Accounts payable aged 90+ days"
      },
      {
        group: "Collections & Payments Discipline",
        key: "overdue_collections_pct",
        label: "% Overdue Collections",
        value: "11%",
        trend: "down",
      },
      {
        group: "Collections & Payments Discipline",
        key: "overdue_payments_pct",
        label: "% Overdue Payments",
        value: "7%",
        trend: "down",
      },
      {
        group: "Collections & Payments Discipline",
        key: "dispute_rate",
        label: "Dispute Rate",
        value: "1.2%",
        notes: "Disputed invoices / total invoices",
        trend: "flat",
      },
      // Taxes & Statutory
      {
        group: "Taxes & Statutory",
        key: "vat_forecast",
        label: "Forecast VAT (payable/receivable)",
        value: "Payable ~ €18k",
        trend: "up",
      },
      // Costs & Returns
      {
        group: "Costs & Returns",
        key: "bank_fees_pct",
        label: "Bank fees as % of collections",
        value: "0.9%",
        trend: "flat",
      },
      {
        group: "Costs & Returns",
        key: "financing_cost",
        label: "Cost of financing (annualized)",
        value: "7.8%",
        trend: "flat",
      },
      // Forecasts & Scenarios
      {
        group: "Forecasts & Scenarios",
        key: "scenario_dso_dpo",
        label: 'Scenario: "DSO +10 / DPO −10"',
        value: "CCC +20 days",
        trend: "up",
      },
    ],
  });

  const buildDemo13WeekForecast = (): ChartSpec => {
    const data = [];
    let opening = 250_000;
    for (let i = 1; i <= 13; i++) {
      const inflows = 90_000 + (i % 4 === 0 ? 12_000 : 0);
      const outflows = 85_000 + (i % 3 === 0 ? 8_000 : 0);
      const net = inflows - outflows;
      const closing = opening + net;
      data.push({
        week: `Wk ${String(i).padStart(2, "0")}`,
        opening,
        inflows,
        outflows,
        net,
        closing,
      });
      opening = closing;
    }
    return {
      kind: "13week-cf",
      title: "13-week Cash Flow Forecast",
      data,
      currency: "€",
    };
  };

  function handleEntityConfirm(entity?: { name: string; vat: string }) {
    // Treat the card click as a confirmation action
    setEntitySelected(true);
    try {
      if (entity) {
        const stored = {
          name: entity.name,
          taxId: entity.vat,
        };
        sessionStorage.setItem(
          "factora:selectedInvoiceClient",
          JSON.stringify(stored)
        );
      }
    } catch (_) {}

    // Simulate short assistant thinking
    setIsThinking(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Great! Ask me anything.",
        },
      ]);

      setIsThinking(false);
    }, 600);
  }

  function handleSend(query?: string) {
    const text = (query ?? input).trim();
    if (!text) return;

    if (!chatStarted) {
      setChatStarted(true);
    }

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setIsThinking(true);

    // MODIFY: Always ask the engine. It will decide: entityCard (if not confirmed),
    // single metric, full report, or 13-week forecast based on the prompt.
    setTimeout(() => {
      const lower = text.toLowerCase();

      // Case 0: FIRST TIME — always show the giant entity card first
      if (messages.length === 0) {
        setMessages((prev) => [...prev, buildEntityCardMessage()]);
        setIsThinking(false);
        return;
      }

      // If entity not confirmed yet, keep asking for confirmation
      if (!entitySelected) {
        setMessages((prev) => [...prev, buildEntityCardMessage()]);
        setIsThinking(false);
        return;
      }

      // Case 1: FULL REPORT
      if (
        lower.includes("full report") ||
        lower.includes("financial health report") ||
        lower.includes("show full report")
      ) {
        const report = buildDemoFullReport();
        const msg: ChatMessage = {
          role: "assistant",
          content: "Here's the full report.",
          fullReport: report,
        };
        setMessages((prev) => [...prev, msg]);
        setIsThinking(false);
        return;
      }

      // Case 2: 13-WEEK FORECAST
      if (
        lower.includes("13-week") ||
        lower.includes("13 week") ||
        lower.includes("forecast")
      ) {
        const chart = buildDemo13WeekForecast();
        const msg: ChatMessage = {
          role: "assistant",
          content: "Here's your 13-week cash flow forecast.",
          chart,
        };
        setMessages((prev) => [...prev, msg]);
        setIsThinking(false);
        return;
      }

      // Case 3: small metric answer (demo) – percentage of accounts payable defaults
      // Key phrase variants we'll catch:
      // "percentage of accounts payable defaults", "ap defaults percentage", "payables default rate"
      if (
        (lower.includes("accounts payable defaults") ||
          lower.includes("ap defaults") ||
          lower.includes("payables default")) &&
        (lower.includes("2025") || lower.includes("2024"))
      ) {
        // Hardcoded demo values
        const pct2025 = "3.2%";
        const pct2024 = "4.1%";
        const msg: ChatMessage = {
          role: "assistant",
          content: `Percentage of accounts payable defaults — 2025: ${pct2025} · 2024: ${pct2024}.`,
        };
        setMessages((prev) => [...prev, msg]);
        setIsThinking(false);
        return;
      }

      // DEFAULT: generic reply
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I can show a full report, the 13-week cash flow forecast, or answer the AP defaults % for 2025/2024. What would you like?",
        },
      ]);
      setIsThinking(false);
    }, 600);
  }

  return {
    chatStarted,
    messages,
    input,
    setInput,
    endRef,
    textareaRef,
    isThinking,
    entitySelected,
    formatCurrentTimestamp,
    handleEntityConfirm,
    handleSend,
  };
}

