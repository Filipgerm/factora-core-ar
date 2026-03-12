"use client";

import { useState, useEffect, useMemo } from "react";
import { useChartAnimation, useChartHover } from "@/hooks/use-chart-animations";
import { usePrivacy } from "@/components/privacy-provider";
import {
  Invoice,
  SortColumn,
  SortDirection,
  RequestOutcomeSummary,
  RequestOutcomeDonutEntry,
} from "@/lib/invoices/invoice-types";
import { CreditLimitRequest } from "@/lib/credit-limit-requests";
import { CUSTOMERS_DATA } from "@/lib/customers-data";
import invoiceSampleData from "@/lib/data/invoice-sample-data.json";
import invoiceConfig from "@/lib/data/invoice-config.json";
import { getInvoicesForCustomer } from "@/lib/invoices/invoice-generation";
import {
  parseAmount,
  parseDate,
  normalizeDrafts,
  normalizePendings,
  getRequestDetailsForInvoice,
} from "@/lib/invoices/invoice-helpers";
import {
  DRAFTS_STORAGE_KEY,
  PENDING_STORAGE_KEY,
  requestTypeLabels,
  requestTypeOrder,
} from "@/lib/config/invoice-constants";
import { getCreditLimitRequests } from "@/lib/credit-limit-requests";
import { InvoiceSummaryCards } from "@/components/invoices/invoice-summary-cards";
import { InvoiceCTASection } from "@/components/invoices/invoice-cta-section";
import { InvoiceFilters } from "@/components/invoices/invoice-filters";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { InvoiceDetailSheet } from "@/components/invoices/invoice-detail-sheet";

const invoiceData = invoiceSampleData as Invoice[];
const invoiceStatusOrder = invoiceConfig.invoiceStatusOrder as Invoice["status"][];
const invoiceStatusPalette = invoiceConfig.invoiceStatusPalette as Record<
  Invoice["status"],
  string
>;
const requestOutcomeColors = invoiceConfig.requestOutcomeColors as Record<
  NonNullable<Invoice["requestType"]>,
  { approved: string; rejected: string }
>;

export function InvoicesContent({
  isIntegrated = false,
  showCreditLimit = true,
  vatNumber,
  showRequestTypeColumn = false,
}: {
  isIntegrated?: boolean;
  showCreditLimit?: boolean;
  vatNumber?: string;
  showRequestTypeColumn?: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [creditLimitReady, setCreditLimitReady] = useState(true);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [draftInvoices, setDraftInvoices] = useState<Invoice[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<Invoice[]>([]);
  const [creditLimitRequests, setCreditLimitRequests] = useState<
    CreditLimitRequest[]
  >([]);

  const { containerRef, animateOnMount } = useChartAnimation();
  const { createTooltip, removeTooltip } = useChartHover();
  const { isDiscreet } = usePrivacy();

  // Check if customer has status "onboarded"
  const customer = vatNumber
    ? CUSTOMERS_DATA.find((c) => c.vatNumber === vatNumber)
    : undefined;
  const isOnboardedCustomer = customer?.status === "onboarded";

  const sortableColumns: SortColumn[] = showRequestTypeColumn
    ? [
      "id",
      "invoiceStatus",
      "vat",
      "created",
      "amount",
      "requestType",
      "requestStatus",
    ]
    : ["id", "invoiceStatus", "vat", "created", "amount", "requestStatus"];

  // Generate invoices for onboarded customers
  const generatedInvoices =
    isOnboardedCustomer && vatNumber
      ? getInvoicesForCustomer(vatNumber, customer?.id)
      : [];

  // Merge invoices: when vatNumber is provided (financing page), exclude static invoiceData
  // and only show generated invoices, drafts, and pending invoices
  const baseInvoices: Invoice[] = vatNumber
    ? [...draftInvoices, ...pendingInvoices, ...generatedInvoices]
    : [
      ...invoiceData,
      ...draftInvoices,
      ...pendingInvoices,
      ...generatedInvoices,
    ];

  // Map invoices to their request status based on credit limit requests
  const allInvoices: Invoice[] = baseInvoices.map((invoice) => ({
    ...invoice,
    ...getRequestDetailsForInvoice(invoice.id, creditLimitRequests),
  }));

  // Handle sort column selection
  const handleSort = (column: SortColumn) => {
    setSortColumn(column);
  };

  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
  };

  useEffect(() => {
    if (!showRequestTypeColumn && sortColumn === "requestType") {
      setSortColumn(null);
    }
  }, [showRequestTypeColumn, sortColumn]);

  // Filter and sort invoices
  const filteredInvoices = useMemo(() => {
    // Filter invoices by customer VAT number if provided
    const invoicesByVat = vatNumber
      ? allInvoices.filter((invoice) => {
        const customerVatSuffix = vatNumber.slice(-6);
        const isGeneratedInvoice = invoice.id.startsWith(
          `INV-${customerVatSuffix}-`
        );
        return isGeneratedInvoice || !invoice.customerVat;
      })
      : allInvoices;

    // Search filter
    const searchFiltered = searchTerm
      ? invoicesByVat.filter((invoice) => {
        const lowerSearch = searchTerm.toLowerCase();
        return (
          invoice.id.toLowerCase().includes(lowerSearch) ||
          (invoice.vat && invoice.vat.toLowerCase().includes(lowerSearch)) ||
          invoice.amount.toLowerCase().includes(lowerSearch) ||
          invoice.status.toLowerCase().includes(lowerSearch) ||
          invoice.created.toLowerCase().includes(lowerSearch) ||
          (invoice.requestStatus &&
            invoice.requestStatus.toLowerCase().includes(lowerSearch)) ||
          (invoice.requestType &&
            invoice.requestType.toLowerCase().includes(lowerSearch))
        );
      })
      : invoicesByVat;

    // Apply sorting if sortColumn is set
    if (!sortColumn) {
      return isIntegrated ? searchFiltered : [];
    }

    const sorted = [...searchFiltered].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortColumn) {
        case "id":
          aValue = a.id.toLowerCase();
          bValue = b.id.toLowerCase();
          break;
        case "created":
          aValue = parseDate(a.created).getTime();
          bValue = parseDate(b.created).getTime();
          break;
        case "amount":
          aValue = parseAmount(a.amount);
          bValue = parseAmount(b.amount);
          break;
        case "invoiceStatus":
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        case "requestStatus":
          aValue = (a.requestStatus || "Not Requested").toLowerCase();
          bValue = (b.requestStatus || "Not Requested").toLowerCase();
          break;
        case "requestType":
          aValue = (a.requestType || "").toLowerCase();
          bValue = (b.requestType || "").toLowerCase();
          break;
        case "vat":
          aValue = (a.vat || "").toLowerCase();
          bValue = (b.vat || "").toLowerCase();
          break;
        default:
          return 0;
      }

      // Compare values
      let comparison = 0;
      if (typeof aValue === "string" && typeof bValue === "string") {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return isIntegrated ? sorted : [];
  }, [
    allInvoices,
    vatNumber,
    isIntegrated,
    searchTerm,
    sortColumn,
    sortDirection,
  ]);

  const {
    formattedTotalInvoiceAmount,
    invoiceStatusData,
    requestOutcomeSummary,
    requestOutcomeDonutData,
    totalInvoiceCount,
  } = useMemo(() => {
    const sanitizeAmount = (amountString: string): number => {
      const cleaned = amountString.replace(/[€$,\s]/g, "");
      return Number.isFinite(Number(cleaned)) ? parseFloat(cleaned) || 0 : 0;
    };

    const totalAmount = filteredInvoices.reduce((sum, invoice) => {
      return sum + sanitizeAmount(invoice.amount);
    }, 0);

    const totalCount = filteredInvoices.length;

    const invoiceStatusCounts: Record<Invoice["status"], number> = {
      Paid: 0,
      Pending: 0,
      Defaulted: 0,
      Draft: 0,
    };

    filteredInvoices.forEach((invoice) => {
      const status = invoice.status;
      if (invoiceStatusCounts[status] !== undefined) {
        invoiceStatusCounts[status] += 1;
      }
    });

    const invoiceStatusTotal = invoiceStatusOrder.reduce(
      (sum, status) => sum + (invoiceStatusCounts[status] ?? 0),
      0
    );

    const invoiceStatusData = invoiceStatusOrder
      .map((status) => {
        const value = invoiceStatusCounts[status] ?? 0;
        return {
          name: status,
          value,
          color: invoiceStatusPalette[status],
          percentage:
            invoiceStatusTotal > 0 ? (value / invoiceStatusTotal) * 100 : 0,
        };
      })
      .filter((entry) => entry.value > 0);

    const requestOutcomeSummary: RequestOutcomeSummary = {
      "credit limit": { approved: 0, rejected: 0 },
      insurance: { approved: 0, rejected: 0 },
    };

    filteredInvoices.forEach((invoice) => {
      const outcome = invoice.requestStatus;
      const requestType = invoice.requestType;

      if (!requestType || !requestOutcomeSummary[requestType]) {
        return;
      }

      if (outcome === "Approved") {
        requestOutcomeSummary[requestType].approved += 1;
      } else if (outcome === "Rejected") {
        requestOutcomeSummary[requestType].rejected += 1;
      }
    });

    const requestOutcomeTotal = requestTypeOrder.reduce((sum, type) => {
      const summary = requestOutcomeSummary[type];
      return sum + summary.approved + summary.rejected;
    }, 0);

    const requestOutcomeDonutData: RequestOutcomeDonutEntry[] = requestTypeOrder
      .flatMap((type) => {
        const summary = requestOutcomeSummary[type];
        return [
          {
            key: `${type}-approved`,
            name: `${requestTypeLabels[type]} · Approved`,
            value: summary.approved,
            color: requestOutcomeColors[type].approved,
            percentage:
              requestOutcomeTotal > 0
                ? (summary.approved / requestOutcomeTotal) * 100
                : 0,
          },
          {
            key: `${type}-rejected`,
            name: `${requestTypeLabels[type]} · Rejected`,
            value: summary.rejected,
            color: requestOutcomeColors[type].rejected,
            percentage:
              requestOutcomeTotal > 0
                ? (summary.rejected / requestOutcomeTotal) * 100
                : 0,
          },
        ];
      })
      .filter((entry) => entry.value > 0);

    const formattedTotal = `€${totalAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    return {
      formattedTotalInvoiceAmount: formattedTotal,
      invoiceStatusData,
      requestOutcomeSummary,
      requestOutcomeDonutData,
      totalInvoiceCount: totalCount,
    };
  }, [filteredInvoices]);

  useEffect(() => {
    // Animate main sections with overview-style entrance and staggered timing
    animateOnMount(".summary-card", { delay: 0.05, stagger: 0.05 });
    animateOnMount(".cta-section");
    animateOnMount(".info-banner", { delay: 0.2 });
    animateOnMount(".invoices-section", { delay: 0.4 });

    // Animate table contents after main sections appear
    setTimeout(() => {
      animateOnMount(".filter-tab", { delay: 0.1 });
      animateOnMount(".invoice-row", { delay: 0.1 });
    }, 400);
  }, [animateOnMount]);

  // Read credit limit readiness from sessionStorage
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const flag = sessionStorage.getItem("creditLimitReady");
        setCreditLimitReady(flag !== "false");
      }
    } catch (_) {
      // ignore
    }
    const handleFocus = () => {
      try {
        const flag = sessionStorage.getItem("creditLimitReady");
        setCreditLimitReady(flag !== "false");
      } catch (_) { }
    };
    window.addEventListener("focus", handleFocus);
    const handleFlagChange = () => {
      try {
        const flag = sessionStorage.getItem("creditLimitReady");
        setCreditLimitReady(flag !== "false");
      } catch { }
    };
    window.addEventListener("creditLimitReadyChanged", handleFlagChange);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("creditLimitReadyChanged", handleFlagChange);
    };
  }, []);

  // Load credit limit requests from sessionStorage
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const requests = getCreditLimitRequests(true);
        setCreditLimitRequests(requests);
      }
    } catch (_) { }

    const handleCreditLimitRequestChange = () => {
      try {
        if (typeof window !== "undefined") {
          const requests = getCreditLimitRequests(true);
          setCreditLimitRequests(requests);
        }
      } catch (_) { }
    };

    window.addEventListener(
      "creditLimitRequestCreated",
      handleCreditLimitRequestChange
    );
    window.addEventListener(
      "creditLimitRequestAccepted",
      handleCreditLimitRequestChange
    );
    window.addEventListener(
      "creditLimitRequestRejected",
      handleCreditLimitRequestChange
    );

    return () => {
      window.removeEventListener(
        "creditLimitRequestCreated",
        handleCreditLimitRequestChange
      );
      window.removeEventListener(
        "creditLimitRequestAccepted",
        handleCreditLimitRequestChange
      );
      window.removeEventListener(
        "creditLimitRequestRejected",
        handleCreditLimitRequestChange
      );
    };
  }, []);

  // Load draft and pending invoices from sessionStorage
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = sessionStorage.getItem(DRAFTS_STORAGE_KEY);
        if (raw) setDraftInvoices(normalizeDrafts(JSON.parse(raw)));
        const praw = sessionStorage.getItem(PENDING_STORAGE_KEY);
        if (praw) setPendingInvoices(normalizePendings(JSON.parse(praw)));
      }
    } catch (_) { }

    const handleCustom = () => {
      try {
        const raw = sessionStorage.getItem(DRAFTS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        setDraftInvoices(normalizeDrafts(parsed));
      } catch (_) { }
    };
    const handlePendingCustom = () => {
      try {
        const raw = sessionStorage.getItem(PENDING_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        setPendingInvoices(normalizePendings(parsed));
      } catch (_) { }
    };

    window.addEventListener("draftInvoicesUpdated", handleCustom as any);
    window.addEventListener(
      "pendingInvoicesUpdated",
      handlePendingCustom as any
    );
    return () => {
      window.removeEventListener("draftInvoicesUpdated", handleCustom as any);
      window.removeEventListener(
        "pendingInvoicesUpdated",
        handlePendingCustom as any
      );
    };
  }, []);

  const visiblePendingIds = filteredInvoices
    .filter(
      (inv) =>
        inv.status === "Pending" &&
        (inv.requestStatus || "Not Requested") === "Not Requested"
    )
    .map((inv) => inv.id);

  const isAllVisibleSelected =
    creditLimitReady &&
    visiblePendingIds.length > 0 &&
    visiblePendingIds.every((id) => selectedInvoiceIds.includes(id));

  // Get selected invoices and calculate total
  const selectedInvoicesMap = new Map<string, Invoice>();
  allInvoices.forEach((inv) => {
    if (
      selectedInvoiceIds.includes(inv.id) &&
      !selectedInvoicesMap.has(inv.id)
    ) {
      selectedInvoicesMap.set(inv.id, inv);
    }
  });
  const selectedInvoices = Array.from(selectedInvoicesMap.values());
  const totalAmount = selectedInvoices.reduce(
    (sum, inv) => sum + parseAmount(inv.amount),
    0
  );

  const toggleSelectAllVisible = () => {
    if (!creditLimitReady) return;
    if (visiblePendingIds.length === 0) return;
    if (isAllVisibleSelected) {
      const remaining = selectedInvoiceIds.filter(
        (id) => !visiblePendingIds.includes(id)
      );
      setSelectedInvoiceIds(remaining);
    } else {
      const union = Array.from(
        new Set([...selectedInvoiceIds, ...visiblePendingIds])
      );
      setSelectedInvoiceIds(union);
    }
  };

  const toggleSelectOne = (id: string, status: string) => {
    if (!creditLimitReady) return;
    if (status !== "Pending") return;
    const invoice = allInvoices.find((inv) => inv.id === id);
    if (!invoice) return;
    const requestStatus = invoice.requestStatus || "Not Requested";
    if (requestStatus !== "Not Requested") return;
    setSelectedInvoiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleInvoiceHover = (invoice: Invoice, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const tooltipContent = isDiscreet
      ? `<div><strong>Invoice ${invoice.id}</strong><br/>Hidden</div>`
      : `
      <div>
        <strong>Invoice ${invoice.id}</strong><br/>
        Created: ${invoice.created}<br/>
        Amount: ${invoice.amount}<br/>
        Status: ${invoice.status}
      </div>
    `;
    createTooltip(tooltipContent, rect.left + rect.width / 2, rect.top);
  };

  const openInvoiceSheet = (invoice: Invoice) => {
    if (!isIntegrated) return;
    removeTooltip();
    setDetailInvoice(invoice);
    setIsSheetOpen(true);
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm("");
    setSortColumn(null);
    setSortDirection("desc");
  };

  const handleRequestSubmitted = () => {
    setSelectedInvoiceIds([]);
  };

  return (
    <div ref={containerRef} className="space-y-6">
      {isIntegrated && (
        <InvoiceSummaryCards
          totalInvoiceCount={totalInvoiceCount}
          formattedTotalInvoiceAmount={formattedTotalInvoiceAmount}
          invoiceStatusData={invoiceStatusData}
          requestOutcomeDonutData={requestOutcomeDonutData}
          requestOutcomeSummary={requestOutcomeSummary}
        />
      )}

      <InvoiceCTASection
        creditLimitReady={creditLimitReady}
        selectedInvoiceIds={selectedInvoiceIds}
        selectedInvoices={selectedInvoices}
        totalAmount={totalAmount}
        vatNumber={vatNumber}
        showCreditLimit={showCreditLimit}
        allInvoices={allInvoices}
        onRequestSubmitted={handleRequestSubmitted}
      />

      <InvoiceFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        sortableColumns={sortableColumns}
        onSort={handleSort}
        onToggleSortDirection={toggleSortDirection}
        onClearFilters={clearFilters}
      />

      <InvoiceTable
        invoices={filteredInvoices}
        isIntegrated={isIntegrated}
        creditLimitReady={creditLimitReady}
        showRequestTypeColumn={showRequestTypeColumn}
        selectedInvoiceIds={selectedInvoiceIds}
        visiblePendingIds={visiblePendingIds}
        isAllVisibleSelected={isAllVisibleSelected}
        onToggleSelectAll={toggleSelectAllVisible}
        onToggleSelectOne={toggleSelectOne}
        onInvoiceClick={openInvoiceSheet}
        onInvoiceHover={handleInvoiceHover}
        onInvoiceHoverLeave={removeTooltip}
        searchTerm={searchTerm}
        sortColumn={sortColumn}
        onClearFilters={clearFilters}
      />

      <InvoiceDetailSheet
        invoice={detailInvoice}
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />
    </div>
  );
}

