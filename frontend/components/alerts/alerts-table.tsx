"use client";

import React from "react";
import type { Alert } from "@/lib/alerts-data";
import { AlertRow } from "./alert-row";

interface AlertsTableProps {
  alerts: Alert[];
  expandedAlertIds: Set<string>;
  onToggleAlert: (alertId: string) => void;
  onCustomerClick: (vatNumber: string) => void;
}

export function AlertsTable({
  alerts,
  expandedAlertIds,
  onToggleAlert,
  onCustomerClick,
}: AlertsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px]">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-2 sm:px-4 py-4 w-10"></th>
            <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
              Customer
            </th>
            <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
              Alert
            </th>
            <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900 hidden lg:table-cell">
              Details
            </th>
            <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
              Date
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {alerts.map((alert) => (
            <AlertRow
              key={alert.id}
              alert={alert}
              isExpanded={expandedAlertIds.has(alert.id)}
              onToggle={() => onToggleAlert(alert.id)}
              onCustomerClick={onCustomerClick}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

