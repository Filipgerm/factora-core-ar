"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Receipt,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  PieChart as PieChartIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getCreditLimitRequests,
  acceptCreditLimitRequest,
  rejectCreditLimitRequest,
  type CreditLimitRequest,
} from "@/lib/credit-limit-requests";
import { CUSTOMERS_DATA } from "@/lib/customers-data";
import { FinancingChart } from "@/components/financing-chart";
import { useUser } from "@/components/user-context";
import { PageLayout } from "@/components/dashboard/page-layout";

type SortColumn = "businessName" | "totalAmount" | "invoiceCount" | "createdAt";
type SortDirection = "asc" | "desc";

const COLUMN_LABELS: Record<SortColumn, string> = {
  businessName: "Business Name",
  totalAmount: "Total Amount",
  invoiceCount: "Invoice Count",
  createdAt: "Created Date",
};

const REQUEST_STATUS_ORDER: CreditLimitRequest["status"][] = [
  "pending",
  "approved",
  "rejected",
];

const REQUEST_STATUS_LABELS: Record<CreditLimitRequest["status"], string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

const REQUEST_STATUS_PALETTE: Record<CreditLimitRequest["status"], string> = {
  pending: "#fbbf24",
  approved: "#34d399",
  rejected: "#f87171",
};

// Invoice type matching invoices-content.tsx
type Invoice = {
  id: string;
  created: string;
  amount: string;
  status: "Paid" | "Pending" | "Defaulted" | "Draft";
  vat?: string;
  businessName?: string;
  businessAddressLines?: string[];
  businessEmail?: string;
  businessPhone?: string;
};

// Table row type - one row per invoice, with parent request metadata
type FinancingTableRow = {
  id: string; // Unique row ID (requestId + invoiceId)
  requestId: string; // Parent FinancingRequest ID
  invoiceId: string; // Invoice ID
  businessName: string;
  requestType: "credit limit" | "insurance";
  totalAmount: number;
  invoiceCount: number;
  providerName?: string;
  createdAt: string;
  vatNumber: string;
  // Invoice data (if available)
  invoice?: Invoice;
};

// Helper function to retrieve invoices by IDs from sessionStorage
function getInvoicesByIds(invoiceIds: string[], vatNumber: string): Invoice[] {
  if (typeof window === "undefined") return [];

  const invoices: Invoice[] = [];
  const invoiceIdSet = new Set(invoiceIds);

  // Check generated invoices
  try {
    const storageKey = `factora:generatedInvoices:${vatNumber}`;
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        parsed.forEach((inv: any) => {
          if (inv && inv.id && invoiceIdSet.has(String(inv.id))) {
            invoices.push({
              id: String(inv.id),
              created: String(inv.created || ""),
              amount: String(inv.amount || "€0.00"),
              status: (inv.status || "Pending") as Invoice["status"],
              vat: String(inv.vat || vatNumber),
              businessName: inv.businessName
                ? String(inv.businessName)
                : undefined,
            });
          }
        });
      }
    }
  } catch (error) {
    console.error("Failed to read generated invoices:", error);
  }

  // Check pending invoices
  try {
    const pendingKey = "factora:pendingInvoices";
    const pendingRaw = sessionStorage.getItem(pendingKey);
    if (pendingRaw) {
      const pending = JSON.parse(pendingRaw);
      if (Array.isArray(pending)) {
        pending.forEach((inv: any) => {
          if (
            inv &&
            inv.id &&
            invoiceIdSet.has(String(inv.id)) &&
            inv.vat === vatNumber
          ) {
            invoices.push({
              id: String(inv.id),
              created: String(inv.created || ""),
              amount: String(inv.amount || "€0.00"),
              status: "Pending" as const,
              vat: String(inv.vat || vatNumber),
              businessName: inv.businessName
                ? String(inv.businessName)
                : undefined,
            });
          }
        });
      }
    }
  } catch (error) {
    console.error("Failed to read pending invoices:", error);
  }

  // Check draft invoices
  try {
    const draftKey = "factora:draftInvoices";
    const draftRaw = sessionStorage.getItem(draftKey);
    if (draftRaw) {
      const draft = JSON.parse(draftRaw);
      if (Array.isArray(draft)) {
        draft.forEach((inv: any) => {
          if (
            inv &&
            inv.id &&
            invoiceIdSet.has(String(inv.id)) &&
            inv.vat === vatNumber
          ) {
            invoices.push({
              id: String(inv.id),
              created: String(inv.created || ""),
              amount: String(inv.amount || "€0.00"),
              status: (inv.status || "Draft") as Invoice["status"],
              vat: String(inv.vat || vatNumber),
              businessName: inv.businessName
                ? String(inv.businessName)
                : undefined,
            });
          }
        });
      }
    }
  } catch (error) {
    console.error("Failed to read draft invoices:", error);
  }

  return invoices;
}

// Helper to parse amount string to number
function parseAmount(amountStr: string): number {
  return parseFloat(amountStr.replace(/[€,]/g, "")) || 0;
}

export function BusinessFinancingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userType } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());
  const [creditLimitRequests, setcreditLimitRequests] = useState<
    CreditLimitRequest[]
  >([]);
  const [selectedInvoices, setSelectedInvoices] = useState<
    Record<string, Set<string>>
  >({});
  const itemsPerPage = 10;

  // Redirect suppliers away from financing page
  useEffect(() => {
    if (userType === "supplier") {
      router.replace("/home");
    }
  }, [userType, router]);

  // Load financing requests from localStorage
  const loadCreditLimitRequests = useCallback(() => {
    try {
      const requests = getCreditLimitRequests(true);
      setcreditLimitRequests(requests);
    } catch (error) {
      console.error("Failed to load financing requests:", error);
    }
  }, []);

  // Load on mount and listen for updates
  useEffect(() => {
    loadCreditLimitRequests();

    const handleCreditLimitRequestChange = () => {
      loadCreditLimitRequests();
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

    // Note: storage events don't fire for sessionStorage changes, so we rely on custom events only

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
  }, [loadCreditLimitRequests]);

  // Transform FinancingRequest entries into table rows (one per invoice)
  const tableRows = useMemo(() => {
    const rows: FinancingTableRow[] = [];

    creditLimitRequests.forEach((request) => {
      // Get invoices for this request
      const invoices = getInvoicesByIds(request.invoiceIds, request.vatNumber);
      const invoiceMap = new Map(invoices.map((inv) => [inv.id, inv]));

      // Create one row per invoice in the request
      request.invoiceIds.forEach((invoiceId) => {
        const invoice = invoiceMap.get(invoiceId);
        rows.push({
          id: `${request.id}-${invoiceId}`,
          requestId: request.id,
          invoiceId,
          businessName: request.businessName,
          requestType: request.requestType,
          totalAmount: request.totalAmount,
          invoiceCount: request.invoiceCount,
          providerName: request.providerName,
          createdAt: request.createdAt,
          vatNumber: request.vatNumber,
          invoice,
        });
      });
    });

    return rows;
  }, [creditLimitRequests]);

  // Get customer filter from URL params
  const customerFilter = useMemo(() => {
    return searchParams.get("customer") || undefined;
  }, [searchParams]);

  useEffect(() => {
    if (customerFilter) {
      setSortColumn(null);
    }
  }, [customerFilter]);

  const toggleRow = (rowId: string) => {
    setExpandedRowIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  // Handle sort column selection
  const handleSort = (column: SortColumn) => {
    setSortColumn(column);
  };

  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
  };

  // Filter and search rows
  const filteredRows = useMemo(() => {
    let rows = tableRows;

    // Apply URL customer filter if present
    if (customerFilter) {
      rows = rows.filter((row) => row.vatNumber === customerFilter);
    }

    // Apply search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      rows = rows.filter(
        (row) =>
          row.businessName.toLowerCase().includes(lowerSearch) ||
          row.invoiceId.toLowerCase().includes(lowerSearch) ||
          (row.providerName &&
            row.providerName.toLowerCase().includes(lowerSearch)) ||
          row.requestType.toLowerCase().includes(lowerSearch)
      );
    }

    // Apply sorting if sortColumn is set
    if (sortColumn) {
      const sorted = [...rows].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortColumn) {
          case "businessName":
            aValue = a.businessName.toLowerCase();
            bValue = b.businessName.toLowerCase();
            break;
          case "totalAmount":
            aValue = a.totalAmount;
            bValue = b.totalAmount;
            break;
          case "invoiceCount":
            aValue = a.invoiceCount;
            bValue = b.invoiceCount;
            break;
          case "createdAt":
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
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
      return sorted;
    }

    return rows;
  }, [searchTerm, sortColumn, sortDirection, customerFilter, tableRows]);

  // Group rows by request ID for display (show unique requests, not duplicate rows)
  const uniqueRequests = useMemo(() => {
    const requestMap = new Map<string, FinancingTableRow[]>();
    filteredRows.forEach((row) => {
      if (!requestMap.has(row.requestId)) {
        requestMap.set(row.requestId, []);
      }
      requestMap.get(row.requestId)!.push(row);
    });
    return Array.from(requestMap.values()).map((rows) => rows[0]); // Use first row as representative
  }, [filteredRows]);

  // Pagination
  const totalPages = Math.ceil(uniqueRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = uniqueRequests.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Calculate metrics
  const metrics = useMemo(() => {
    const defaulted = filteredRows.filter(
      (row) => row.invoice?.status === "Defaulted"
    ).length;
    const pending = filteredRows.filter(
      (row) => row.invoice?.status === "Pending"
    ).length;
    const paid = filteredRows.filter(
      (row) => row.invoice?.status === "Paid"
    ).length;
    const totalAmount = uniqueRequests.reduce(
      (sum, row) => sum + row.totalAmount,
      0
    );
    const uniqueCustomers = new Set(filteredRows.map((row) => row.vatNumber))
      .size;

    return { defaulted, pending, paid, totalAmount, uniqueCustomers };
  }, [filteredRows, uniqueRequests]);

  const requestStatusSummary = useMemo(() => {
    const statusLookup = creditLimitRequests.reduce((acc, request) => {
      acc[request.id] = request.status;
      return acc;
    }, {} as Record<string, CreditLimitRequest["status"]>);

    const counts: Record<CreditLimitRequest["status"], number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    uniqueRequests.forEach((row) => {
      const status = statusLookup[row.requestId] ?? "pending";
      counts[status] += 1;
    });

    const total = REQUEST_STATUS_ORDER.reduce(
      (sum, status) => sum + counts[status],
      0
    );

    const data = REQUEST_STATUS_ORDER.map((status) => {
      const value = counts[status];
      return {
        name: REQUEST_STATUS_LABELS[status],
        value,
        color: REQUEST_STATUS_PALETTE[status],
        percentage: total > 0 ? (value / total) * 100 : 0,
        status,
      };
    }).filter((entry) => entry.value > 0);

    return { counts, data, total };
  }, [uniqueRequests, creditLimitRequests]);


  const invoiceStatusHighlights = useMemo(() => {
    const total = metrics.pending + metrics.defaulted + metrics.paid;

    const createHighlight = (
      label: string,
      value: number,
      icon: React.ComponentType<React.SVGProps<SVGSVGElement>>,
      iconBg: string,
      iconColor: string
    ) => ({
      label,
      value,
      icon,
      iconBg,
      iconColor,
      percentage: total > 0 ? (value / total) * 100 : 0,
    });

    return [
      createHighlight(
        "Pending",
        metrics.pending,
        TrendingUp,
        "bg-amber-50",
        "text-amber-600"
      ),
      createHighlight(
        "Defaulted",
        metrics.defaulted,
        AlertTriangle,
        "bg-red-50",
        "text-red-600"
      ),
      createHighlight(
        "Paid",
        metrics.paid,
        CheckCircle2,
        "bg-emerald-50",
        "text-emerald-600"
      ),
    ];
  }, [metrics]);

  const getStatusBadge = (status: "pending" | "approved" | "rejected") => {
    const config = {
      pending: {
        label: "Pending",
        className: "bg-gray-100 text-gray-800 border-gray-200",
      },
      approved: {
        label: "Approved",
        className: "bg-green-100 text-green-800 border-green-200",
      },
      rejected: {
        label: "Rejected",
        className: "bg-red-100 text-red-800 border-red-200",
      },
    };
    const conf = config[status];
    return (
      <Badge
        variant="outline"
        className={`${conf.className} border flex items-center gap-1`}
      >
        {status === "approved" && <CheckCircle2 className="w-3 h-3" />}
        {status === "rejected" && <X className="w-3 h-3" />}
        {conf.label}
      </Badge>
    );
  };

  const handleCustomerClick = (vatNumber: string) => {
    router.push(`/customers/${vatNumber}`);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSortColumn(null);
    setSortDirection("desc");
    setCurrentPage(1);
    if (customerFilter) {
      router.push("/financing");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get all invoices for a request
  const getRequestInvoices = (requestId: string): Invoice[] => {
    return tableRows
      .filter((row) => row.requestId === requestId && row.invoice)
      .map((row) => row.invoice!)
      .filter(Boolean);
  };

  // Handle invoice selection
  const toggleInvoiceSelection = (requestId: string, invoiceId: string) => {
    setSelectedInvoices((prev) => {
      const newState = { ...prev };
      if (!newState[requestId]) {
        newState[requestId] = new Set();
      }
      const invoiceSet = new Set(newState[requestId]);
      if (invoiceSet.has(invoiceId)) {
        invoiceSet.delete(invoiceId);
      } else {
        invoiceSet.add(invoiceId);
      }
      newState[requestId] = invoiceSet;
      return newState;
    });
  };

  // Handle select all invoices for a request
  const toggleSelectAll = (requestId: string, invoiceIds: string[]) => {
    setSelectedInvoices((prev) => {
      const newState = { ...prev };
      const currentSelected = newState[requestId] || new Set();
      const allSelected = invoiceIds.every((id) => currentSelected.has(id));

      if (allSelected) {
        // Deselect all
        newState[requestId] = new Set();
      } else {
        // Select all
        newState[requestId] = new Set(invoiceIds);
      }
      return newState;
    });
  };

  // Calculate selected invoices total
  const getSelectedInvoicesTotal = (requestId: string): number => {
    const selected = selectedInvoices[requestId] || new Set();
    const invoices = getRequestInvoices(requestId);
    return invoices
      .filter((inv) => selected.has(inv.id))
      .reduce((sum, inv) => sum + parseAmount(inv.amount), 0);
  };

  // Handle approve request
  const handleApprove = (requestId: string) => {
    const request = creditLimitRequests.find((req) => req.id === requestId);
    if (!request) return;

    // Use a generic business name for now - can be updated to use actual business context
    const businessName = "Business";
    const success = acceptCreditLimitRequest(requestId, businessName);

    if (success) {
      // Reload requests to reflect the change
      loadCreditLimitRequests();

      // Clear selection and collapse
      setSelectedInvoices((prev) => {
        const newState = { ...prev };
        delete newState[requestId];
        return newState;
      });
      setExpandedRowIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  // Handle reject request
  const handleReject = (requestId: string) => {
    const request = creditLimitRequests.find((req) => req.id === requestId);
    if (!request) return;

    // Use a generic business name for now - can be updated to use actual business context
    const businessName = "Business";
    const success = rejectCreditLimitRequest(requestId, businessName);

    if (success) {
      // Reload requests to reflect the change
      loadCreditLimitRequests();

      // Clear selection and collapse
      setSelectedInvoices((prev) => {
        const newState = { ...prev };
        delete newState[requestId];
        return newState;
      });
      setExpandedRowIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  // Handle cancel
  const handleCancel = (requestId: string) => {
    setSelectedInvoices((prev) => {
      const newState = { ...prev };
      delete newState[requestId];
      return newState;
    });
    setExpandedRowIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(requestId);
      return newSet;
    });
  };

  if (userType === "supplier") {
    return (
      <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-dashed border-slate-300 bg-white/80">
            <CardHeader>
              <CardTitle>Financing unavailable</CardTitle>
              <CardDescription>
                Supplier accounts cannot access financing and insurance
                workflows.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Switch to a financial institution profile from your account
                settings to review financing requests.
              </p>
              <Button onClick={() => router.push("/home")}>
                Back to dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <PageLayout
      title="Financing"
      description={`${uniqueRequests.length} request${uniqueRequests.length !== 1 ? "s" : ""
        } across ${metrics.uniqueCustomers} customer${metrics.uniqueCustomers !== 1 ? "s" : ""
        } • Total: €${metrics.totalAmount.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`}
      background="slate-50"
    >

      {/* Status Summary */}
      <div className="grid grid-cols-1 gap-4 mb-6 lg:grid-cols-3">
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-gray-700">
                Invoice Status Overview
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Pending, defaulted and paid invoices
              </CardDescription>
            </div>
            <div className="p-2 rounded-lg bg-gray-100">
              <Receipt className="w-5 h-5 text-gray-700" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {invoiceStatusHighlights.map(
                ({
                  label,
                  value,
                  icon: Icon,
                  iconBg,
                  iconColor,
                  percentage,
                }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`rounded-md p-2 ${iconBg}`}>
                        <Icon className={`h-5 w-5 ${iconColor}`} />
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          {label}
                        </p>
                        <p className="text-xl font-semibold text-gray-900">
                          {value}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs font-medium text-gray-500">
                      {Math.round(percentage)}%
                    </p>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-gray-700">
                Request Status
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Distribution of financing outcomes
              </CardDescription>
            </div>
            <div className="p-2 rounded-lg bg-indigo-50">
              <PieChartIcon className="w-5 h-5 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {requestStatusSummary.data.length > 0 ? (
              <FinancingChart data={requestStatusSummary.data} />
            ) : (
              <div className="flex h-56 items-center justify-center text-sm text-gray-500">
                No request status data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search by business name or invoice number..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 h-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
            />
          </div>

          {/* Sort By */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full lg:w-[220px] h-10 bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-600"
              >
                Sort By:{" "}
                {sortColumn
                  ? `${COLUMN_LABELS[sortColumn]} ${sortDirection === "asc" ? "↑" : "↓"
                  }`
                  : "None"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Sort By Column</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(
                [
                  "businessName",
                  "totalAmount",
                  "invoiceCount",
                  "createdAt",
                ] as SortColumn[]
              ).map((column) => (
                <DropdownMenuItem
                  key={column}
                  onClick={() => handleSort(column)}
                  className={
                    sortColumn === column ? "bg-slate-100 font-medium" : ""
                  }
                >
                  {COLUMN_LABELS[column]}
                  {sortColumn === column && (
                    <span className="ml-auto">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
              {sortColumn && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Sort Direction</DropdownMenuLabel>
                  <DropdownMenuItem onClick={toggleSortDirection}>
                    {sortDirection === "asc" ? (
                      <>
                        <ArrowDown className="mr-2 h-4 w-4" />
                        Descending
                      </>
                    ) : (
                      <>
                        <ArrowUp className="mr-2 h-4 w-4" />
                        Ascending
                      </>
                    )}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear Filters */}
          {(searchTerm || sortColumn !== null || customerFilter) && (
            <Button variant="outline" onClick={clearFilters} className="h-10">
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>

        {/* Customer Filter Indicator */}
        {customerFilter && (
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Filtered by customer
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/financing")}
              className="h-6 text-xs"
            >
              Remove filter
            </Button>
          </div>
        )}
      </div>

      {/* Financing Table */}
      {paginatedRequests.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-2 sm:px-4 py-4 w-10"></th>
                  <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                    Business Name
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                    Total Amount
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                    Invoice Count
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                    Status
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                    Created Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedRequests.map((row) => {
                  const isExpanded = expandedRowIds.has(row.requestId);
                  const requestInvoices = getRequestInvoices(row.requestId);
                  const selected =
                    selectedInvoices[row.requestId] || new Set();
                  const selectedTotal = getSelectedInvoicesTotal(
                    row.requestId
                  );
                  const request = creditLimitRequests.find(
                    (req) => req.id === row.requestId
                  );
                  const requestStatus = request?.status || "pending";
                  const selectionDisabled =
                    requestStatus === "approved" ||
                    requestStatus === "rejected";

                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => toggleRow(row.requestId)}
                      >
                        <td className="px-2 sm:px-4 py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRow(row.requestId);
                            }}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            aria-label={isExpanded ? "Collapse" : "Expand"}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="text-sm">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCustomerClick(row.vatNumber);
                              }}
                              className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-left"
                            >
                              {row.businessName}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">
                            €
                            {row.totalAmount.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {row.invoiceCount}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          {getStatusBadge(requestStatus)}
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {formatDate(row.createdAt)}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 sm:px-6 py-6 bg-slate-50"
                          >
                            <div className="animate-in fade-in duration-200">
                              <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                  <Receipt className="w-5 h-5 text-blue-600" />
                                  <h4 className="font-semibold text-gray-900">
                                    Select Invoices to{" "}
                                    {row.requestType === "credit limit"
                                      ? "Finance"
                                      : "Insure"}
                                  </h4>
                                </div>

                                {/* Invoice List with Checkboxes */}
                                <div className="bg-white p-4 rounded-lg border border-gray-200">
                                  {requestInvoices.length > 0 ? (
                                    <>
                                      {/* Select All Option */}
                                      <div className="mb-3 pb-3 border-b border-gray-200">
                                        <div className="flex items-center gap-3">
                                          <Checkbox
                                            checked={
                                              requestInvoices.length > 0 &&
                                              requestInvoices.every((inv) =>
                                                selected.has(inv.id)
                                              )
                                            }
                                            disabled={selectionDisabled}
                                            onCheckedChange={() => {
                                              if (selectionDisabled) return;
                                              toggleSelectAll(
                                                row.requestId,
                                                requestInvoices.map(
                                                  (inv) => inv.id
                                                )
                                              );
                                            }}
                                            onClick={(e) =>
                                              e.stopPropagation()
                                            }
                                          />
                                          <label
                                            className={`text-sm font-medium ${selectionDisabled
                                              ? "text-gray-400 cursor-not-allowed"
                                              : "text-gray-700 cursor-pointer"
                                              }`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (selectionDisabled) {
                                                return;
                                              }
                                              toggleSelectAll(
                                                row.requestId,
                                                requestInvoices.map(
                                                  (inv) => inv.id
                                                )
                                              );
                                            }}
                                          >
                                            Select All (
                                            {requestInvoices.length} invoice
                                            {requestInvoices.length !== 1
                                              ? "s"
                                              : ""}
                                            )
                                          </label>
                                        </div>
                                      </div>

                                      {/* Invoice List with Overflow */}
                                      <div className="space-y-3 max-h-[280px] overflow-y-auto">
                                        {requestInvoices.map((invoice) => {
                                          const isSelected = selected.has(
                                            invoice.id
                                          );
                                          return (
                                            <div
                                              key={invoice.id}
                                              className={`flex items-center gap-3 p-3 rounded-lg border border-gray-200 transition-colors ${selectionDisabled
                                                ? "bg-gray-50 opacity-60"
                                                : "hover:bg-gray-50"
                                                }`}
                                            >
                                              <Checkbox
                                                checked={isSelected}
                                                disabled={selectionDisabled}
                                                onCheckedChange={() => {
                                                  if (selectionDisabled) {
                                                    return;
                                                  }
                                                  toggleInvoiceSelection(
                                                    row.requestId,
                                                    invoice.id
                                                  );
                                                }}
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                              />
                                              <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                                                <div>
                                                  <span className="text-gray-500">
                                                    Invoice ID:
                                                  </span>
                                                  <span className="ml-2 font-medium">
                                                    {invoice.id}
                                                  </span>
                                                </div>
                                                <div>
                                                  <span className="text-gray-500">
                                                    Amount:
                                                  </span>
                                                  <span className="ml-2 font-medium">
                                                    {invoice.amount}
                                                  </span>
                                                </div>
                                                <div>
                                                  <span className="text-gray-500">
                                                    Created:
                                                  </span>
                                                  <span className="ml-2 font-medium">
                                                    {invoice.created}
                                                  </span>
                                                </div>
                                                <div>
                                                  <span className="text-gray-500">
                                                    Status:
                                                  </span>
                                                  <Badge
                                                    variant="secondary"
                                                    className={`ml-2 ${invoice.status ===
                                                      "Paid"
                                                      ? "bg-green-100 text-green-800"
                                                      : invoice.status ===
                                                        "Pending"
                                                        ? "bg-amber-100 text-amber-800"
                                                        : invoice.status ===
                                                          "Defaulted"
                                                          ? "bg-red-100 text-red-800"
                                                          : "bg-slate-100 text-slate-800"
                                                      }`}
                                                  >
                                                    {invoice.status}
                                                  </Badge>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </>
                                  ) : (
                                    <p className="text-sm text-gray-500">
                                      No invoice data available for this
                                      request.
                                    </p>
                                  )}
                                </div>

                                {/* Selected Total */}
                                {selected.size > 0 && (
                                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium text-gray-700">
                                        Selected Invoices Total:
                                      </span>
                                      <span className="text-sm font-semibold text-gray-900">
                                        €
                                        {selectedTotal.toLocaleString(
                                          "en-US",
                                          {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          }
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex items-center gap-3 justify-end">
                                  <Button
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCancel(row.requestId);
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReject(row.requestId);
                                    }}
                                    className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                                    disabled={
                                      requestStatus === "approved" ||
                                      requestStatus === "rejected"
                                    }
                                  >
                                    Reject
                                  </Button>
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApprove(row.requestId);
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    disabled={
                                      requestStatus === "approved" ||
                                      requestStatus === "rejected"
                                    }
                                  >
                                    Approve
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-4 sm:px-6 py-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-700 text-center sm:text-left">
                  Showing {startIndex + 1} to{" "}
                  {Math.min(startIndex + itemsPerPage, uniqueRequests.length)}{" "}
                  of {uniqueRequests.length} results
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="hidden sm:inline-flex"
                  >
                    ««
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    ‹
                  </Button>
                  <span className="text-sm text-gray-700 px-2 sm:px-3">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    ›
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="hidden sm:inline-flex"
                  >
                    »»
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center shadow-sm">
          <div className="text-gray-400 mb-4">
            <Receipt className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No financing requests found
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || sortColumn !== null
              ? "Try adjusting your search or filters."
              : "No financing requests at this time."}
          </p>
          {(searchTerm || sortColumn !== null) && (
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      )}
    </PageLayout>
  );
}
