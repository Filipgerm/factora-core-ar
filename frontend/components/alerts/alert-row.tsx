"use client";

import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Alert } from "@/lib/alerts-data";
import {
  formatAlertDate,
  getSeverityBadgeConfig,
} from "@/lib/utils/alerts";
import { AlertExpandedDetails } from "./alert-expanded-details";

interface AlertRowProps {
  alert: Alert;
  isExpanded: boolean;
  onToggle: () => void;
  onCustomerClick: (vatNumber: string) => void;
}

export function AlertRow({
  alert,
  isExpanded,
  onToggle,
  onCustomerClick,
}: AlertRowProps) {
  const severityConfig = getSeverityBadgeConfig(alert.type);

  return (
    <React.Fragment>
      <tr
        className="hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-2 sm:px-4 py-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
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
                onCustomerClick(alert.customerVatNumber);
              }}
              className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-left"
            >
              {alert.customerBusinessName}
            </button>
          </div>
        </td>
        <td className="px-4 sm:px-6 py-4">
          <div className="space-y-2">
            <div>
              <Badge
                variant="outline"
                className={`${severityConfig.className} border flex items-center gap-1`}
              >
                {severityConfig.label}
              </Badge>
            </div>
            <div className="text-sm font-medium text-gray-900">
              {alert.title}
            </div>
          </div>
        </td>
        <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 hidden lg:table-cell">
          <div>{alert.description}</div>
        </td>
        <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">
          <div>{formatAlertDate(alert.createdAt)}</div>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={5} className="px-4 sm:px-6 py-6 bg-slate-50">
            <AlertExpandedDetails alert={alert} />
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

