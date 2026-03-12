"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import { CUSTOMERS_DATA } from "@/lib/customers-data";
import { useChartAnimation } from "@/hooks/use-chart-animations";
import {
  getCreditLimitRequests,
  type CreditLimitRequest,
} from "@/lib/credit-limit-requests";
import { useUser } from "@/components/user-context";
import { PREVIOUS_CUSTOMERS_DATA } from "@/lib/data/fi/previous-customers";
import {
  buildNotifications,
  getBadgeCounts,
  getExpandedLists,
} from "@/lib/utils/fi-dashboard";
import type {
  AlertNotification,
  NotificationBadgeCounts,
  NotificationExpansionState,
  RequestNotification,
  StatusNotification,
} from "@/lib/types/fi-dashboard";
import { FiHeader } from "@/components/dashboards/fi/FiHeader";
import { FiQuickActions } from "@/components/dashboards/fi/FiQuickActions";
import { FiStatusNotifications } from "@/components/dashboards/fi/FiStatusNotifications";
import { FiAlertsNotifications } from "@/components/dashboards/fi/FiAlertsNotifications";
import { FiRequestsNotifications } from "@/components/dashboards/fi/FiRequestsNotifications";

// types & helpers now live in /lib/types/fi-dashboard and /lib/utils/fi-dashboard

/**
 * ===== UI =====
 */
export function FinancialInstitutionDashboard() {
  const router = useRouter();
  const { containerRef, animateOnMount } = useChartAnimation();
  const { userType } = useUser();

  useEffect(() => {
    animateOnMount(".home-header", { delay: 0.05 });
    animateOnMount(".home-action", { delay: 0.1, stagger: 0.1 });
    animateOnMount(".home-notif", { delay: 0.25, stagger: 0.05 });
  }, [animateOnMount]);

  const handleCreditCheck = () => router.push("/send-link");
  const handleAICopilot = () => router.push("/ai-copilot");

  const handleStatusClick = (notification: StatusNotification) => {
    if (notification.customerVatNumber) {
      router.push(`/customers/${notification.customerVatNumber}?tab=summary`);
    }
  };

  const handleAlertClick = (notification: AlertNotification) => {
    if (notification.customerVatNumber) {
      router.push(`/alerts?customer=${notification.customerVatNumber}`);
    }
  };

  const handleRequestClick = (notification: RequestNotification) => {
    if (notification.customerVatNumber) {
      router.push(`/financing?customer=${notification.customerVatNumber}`);
    }
  };

  // Convert CreditLimitRequest to RequestNotification
  const convertCreditLimitRequestToNotification = useCallback(
    (request: CreditLimitRequest): RequestNotification => {
      return {
        id: request.id,
        kind: "request",
        customerId: request.vatNumber,
        businessName: request.businessName,
        createdAt: request.createdAt,
        read: false,
        requestType: request.requestType,
        amount: request.totalAmount,
        invoiceCount: request.invoiceCount,
        customerVatNumber: request.vatNumber,
        details: request.providerName || undefined,
      };
    },
    []
  );

  const {
    statusEvents,
    alertEvents,
    requestEvents: baseRequestEvents,
  } = useMemo(
    () => buildNotifications(PREVIOUS_CUSTOMERS_DATA, CUSTOMERS_DATA),
    []
  );

  // Read financing requests from localStorage
  const [creditLimitRequests, setCreditLimitRequests] = useState<
    CreditLimitRequest[]
  >([]);

  useEffect(() => {
    const loadCreditLimitRequests = () => {
      try {
        const requests = getCreditLimitRequests();
        setCreditLimitRequests(requests);
      } catch (error) {
        console.error("Failed to load credit Limit requests:", error);
      }
    };

    // Load on mount
    loadCreditLimitRequests();

    // Listen for custom events
    const handleCreditLimitRequestCreated = () => {
      loadCreditLimitRequests();
    };

    window.addEventListener(
      "creditLimitRequestCreated",
      handleCreditLimitRequestCreated
    );

    // Note: storage events don't fire for sessionStorage changes, so we rely on custom events only

    return () => {
      window.removeEventListener(
        "creditLimitRequestCreated",
        handleCreditLimitRequestCreated
      );
    };
  }, []);

  // Merge base request events with financing requests from localStorage
  const requestEvents = useMemo(() => {
    const CreditLimitRequestNotifications = creditLimitRequests.map(
      convertCreditLimitRequestToNotification
    );
    const allRequests = [
      ...baseRequestEvents,
      ...CreditLimitRequestNotifications,
    ];
    // Sort by createdAt, most recent first
    return allRequests.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [
    baseRequestEvents,
    creditLimitRequests,
    convertCreditLimitRequestToNotification,
  ]);

  const [notificationExpansion, setNotificationExpansion] =
    useState<NotificationExpansionState>({
      status: false,
      alerts: false,
      requests: false,
    });

  const DEFAULT_LIMITS = {
    status: 3,
    alerts: 3,
    requests: 3,
  };

  // Totals from data
  const totals: NotificationBadgeCounts = {
    status: statusEvents.length,
    alerts: alertEvents.length,
    requests: requestEvents.length,
  };

  const {
    status: statusList,
    alerts: alertList,
    requests: requestList,
  } = getExpandedLists<StatusNotification | AlertNotification | RequestNotification>(
    { status: statusEvents, alerts: alertEvents, requests: requestEvents },
    DEFAULT_LIMITS,
    notificationExpansion
  );

  const badgeCounts = getBadgeCounts(totals);

  const canExpand = {
    status: totals.status > DEFAULT_LIMITS.status,
    alerts: totals.alerts > DEFAULT_LIMITS.alerts,
    requests: totals.requests > DEFAULT_LIMITS.requests,
  };

  return (
    <main
      className="flex-1 overflow-y-auto bg-slate-50 min-h-screen"
      ref={containerRef}
    >
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <FiHeader />

        <FiQuickActions
          onCreditCheck={handleCreditCheck}
          onAICopilot={handleAICopilot}
        />

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">
            Notifications
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FiStatusNotifications
              items={statusList as StatusNotification[]}
              badgeCount={badgeCounts.status}
              canExpand={canExpand.status}
              expanded={notificationExpansion.status}
              onToggle={() =>
                setNotificationExpansion((prev) => ({
                  ...prev,
                  status: !prev.status,
                }))
              }
              onClick={handleStatusClick}
            />

            <FiAlertsNotifications
              items={alertList as AlertNotification[]}
              badgeCount={badgeCounts.alerts}
              canExpand={canExpand.alerts}
              expanded={notificationExpansion.alerts}
              onToggle={() =>
                setNotificationExpansion((prev) => ({
                  ...prev,
                  alerts: !prev.alerts,
                }))
              }
              onClick={handleAlertClick}
            />

            {userType !== "supplier" && (
              <FiRequestsNotifications
                items={requestList as RequestNotification[]}
                badgeCount={badgeCounts.requests}
                canExpand={canExpand.requests}
                expanded={notificationExpansion.requests}
                onToggle={() =>
                  setNotificationExpansion((prev) => ({
                    ...prev,
                    requests: !prev.requests,
                  }))
                }
                onClick={handleRequestClick}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
