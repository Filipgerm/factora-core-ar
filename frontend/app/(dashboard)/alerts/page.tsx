"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageLayout } from "@/components/dashboard/page-layout";
import {
  ALERTS_DATA,
  searchAlerts,
  filterAlerts,
  type Alert,
  type AlertType,
  type AlertCategory,
} from "@/lib/alerts-data";
import { CUSTOMERS_DATA } from "@/lib/customers-data";
import {
  sortAlerts,
  ITEMS_PER_PAGE,
  type SortColumn,
  type SortDirection,
} from "@/lib/utils/alerts";
import { AlertsHeader } from "@/components/alerts/alerts-header";
import { AlertsSeveritySummary } from "@/components/alerts/alerts-severity-summary";
import { AlertsFilters } from "@/components/alerts/alerts-filters";
import { AlertsTable } from "@/components/alerts/alerts-table";
import { AlertsPagination } from "@/components/alerts/alerts-pagination";
import { AlertsEmptyState } from "@/components/alerts/alerts-empty-state";

export default function AlertsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedAlertIds, setExpandedAlertIds] = useState<Set<string>>(
    new Set()
  );

  const toggleAlert = (alertId: string) => {
    setExpandedAlertIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(alertId)) {
        newSet.delete(alertId);
      } else {
        newSet.add(alertId);
      }
      return newSet;
    });
  };

  // Get customer filter from URL params
  const customerFilter = useMemo(() => {
    return searchParams.get("customer") || undefined;
  }, [searchParams]);

  useEffect(() => {
    if (customerFilter) {
      setSortColumn(null);
    }
  }, [customerFilter]);

  // Get onboarded customers and create a map for efficient lookup
  const onboardedCustomers = useMemo(() => {
    return CUSTOMERS_DATA.filter((customer) => customer.status === "onboarded");
  }, []);

  const onboardedCustomerVatNumbers = useMemo(() => {
    return new Set(onboardedCustomers.map((customer) => customer.vatNumber));
  }, [onboardedCustomers]);

  // Generate default alerts for onboarded customers without alerts
  const generateDefaultAlerts = useMemo(() => {
    const existingAlertVatNumbers = new Set(
      ALERTS_DATA.map((alert) => alert.customerVatNumber)
    );

    const defaultAlerts: Alert[] = onboardedCustomers
      .filter((customer) => !existingAlertVatNumbers.has(customer.vatNumber))
      .map((customer, index) => {
        const alertId = `alert-default-${customer.id}`;
        const now = new Date();
        const createdAt = new Date(
          now.getTime() - index * 24 * 60 * 60 * 1000
        ).toISOString();

        return {
          id: alertId,
          type: "info" as AlertType,
          category: "payment_trend" as AlertCategory,
          customerId: customer.id,
          customerVatNumber: customer.vatNumber,
          customerName: customer.name,
          customerBusinessName: customer.businessName,
          title: "Payment behavior monitoring",
          description: `Monitoring payment patterns for ${customer.businessName}. No significant issues detected.`,
          createdAt,
          severity: 2,
          avgDaysToPay: 28,
          trendDirection: "stable" as const,
          economicBehavior: {
            summary:
              "Payment behavior is stable with consistent on-time payments.",
            events: [
              {
                type: "check_payment",
                date: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split("T")[0],
                description: "Payment received on time",
                impact: "low",
              },
            ],
            paymentPattern: {
              current: 28,
              previous: 28,
              trend: "stable",
            },
          },
        };
      });

    return defaultAlerts;
  }, [onboardedCustomers]);

  // Handle sort column selection
  const handleSort = (column: SortColumn) => {
    setSortColumn(column);
  };

  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
  };

  // Filter and search alerts
  const filteredAlerts = useMemo(() => {
    // First, filter ALERTS_DATA to only include alerts for onboarded customers
    let alerts = ALERTS_DATA.filter((alert) =>
      onboardedCustomerVatNumbers.has(alert.customerVatNumber)
    );

    // Add default alerts for onboarded customers without alerts
    alerts = [...alerts, ...generateDefaultAlerts];

    // Apply URL customer filter if present
    if (customerFilter) {
      alerts = filterAlerts(alerts, {
        customerVatNumber: customerFilter,
      });
    }

    // Apply search
    alerts = searchAlerts(alerts, searchTerm);

    // Apply sorting
    return sortAlerts(alerts, sortColumn, sortDirection);
  }, [
    searchTerm,
    sortColumn,
    sortDirection,
    customerFilter,
    onboardedCustomerVatNumbers,
    generateDefaultAlerts,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredAlerts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedAlerts = filteredAlerts.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  // Calculate metrics from filtered alerts (onboarded customers only)
  const allOnboardedCustomerAlerts = useMemo(() => {
    const filtered = ALERTS_DATA.filter((alert) =>
      onboardedCustomerVatNumbers.has(alert.customerVatNumber)
    );
    return [...filtered, ...generateDefaultAlerts];
  }, [onboardedCustomerVatNumbers, generateDefaultAlerts]);

  const criticalCount = allOnboardedCustomerAlerts.filter(
    (alert) => alert.type === "critical"
  ).length;
  const highCount = criticalCount;
  const mediumCount = allOnboardedCustomerAlerts.filter(
    (alert) => alert.type === "warning"
  ).length;
  const lowCount = allOnboardedCustomerAlerts.filter(
    (alert) => alert.type === "info"
  ).length;
  const customersAffected = new Set(
    filteredAlerts.map((alert) => alert.customerVatNumber)
  ).size;

  const handleCustomerClick = (vatNumber: string) => {
    router.push(`/customers/${vatNumber}`);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSortColumn(null);
    setSortDirection("desc");
    setCurrentPage(1);
    if (customerFilter) {
      router.push("/alerts");
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <PageLayout
      title="Alerts"
      description={`${filteredAlerts.length} alert${
        filteredAlerts.length !== 1 ? "s" : ""
      } across ${customersAffected} customer${
        customersAffected !== 1 ? "s" : ""
      }`}
      background="slate-50"
    >

        <AlertsSeveritySummary
          highCount={highCount}
          mediumCount={mediumCount}
          lowCount={lowCount}
        />

        <AlertsFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          onToggleSortDirection={toggleSortDirection}
          customerFilter={customerFilter}
          onClearFilters={clearFilters}
          onRemoveCustomerFilter={() => router.push("/alerts")}
        />

        {paginatedAlerts.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <AlertsTable
              alerts={paginatedAlerts}
              expandedAlertIds={expandedAlertIds}
              onToggleAlert={toggleAlert}
              onCustomerClick={handleCustomerClick}
            />
            <AlertsPagination
              currentPage={currentPage}
              totalPages={totalPages}
              startIndex={startIndex}
              itemsPerPage={ITEMS_PER_PAGE}
              totalItems={filteredAlerts.length}
              onPageChange={handlePageChange}
            />
          </div>
        ) : (
          <AlertsEmptyState
            hasFilters={!!(searchTerm || sortColumn !== null)}
            onClearFilters={clearFilters}
          />
        )}
    </PageLayout>
  );
}
