"use client";

import { Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sensitive } from "@/components/ui/sensitive";
import { Invoice } from "@/lib/invoices/invoice-types";
import { CreditLimitRequest } from "@/lib/credit-limit-requests";
import invoiceConfig from "@/lib/data/invoice-config.json";
import { requestTypeLabels } from "@/lib/config/invoice-constants";

const statusColors = invoiceConfig.statusColors as Record<
  Invoice["status"],
  string
>;
const requestStatusColors = invoiceConfig.requestStatusColors as Record<
  string,
  string
>;
const requestTypeColors = invoiceConfig.requestTypeColors as Record<
  NonNullable<Invoice["requestType"]>,
  string
>;

interface InvoiceTableProps {
  invoices: Invoice[];
  isIntegrated: boolean;
  creditLimitReady: boolean;
  showRequestTypeColumn: boolean;
  selectedInvoiceIds: string[];
  visiblePendingIds: string[];
  isAllVisibleSelected: boolean;
  onToggleSelectAll: () => void;
  onToggleSelectOne: (id: string, status: string) => void;
  onInvoiceClick: (invoice: Invoice) => void;
  onInvoiceHover: (invoice: Invoice, event: React.MouseEvent) => void;
  onInvoiceHoverLeave: () => void;
  searchTerm: string;
  sortColumn: string | null;
  onClearFilters: () => void;
}

export function InvoiceTable({
  invoices,
  isIntegrated,
  creditLimitReady,
  showRequestTypeColumn,
  selectedInvoiceIds,
  visiblePendingIds,
  isAllVisibleSelected,
  onToggleSelectAll,
  onToggleSelectOne,
  onInvoiceClick,
  onInvoiceHover,
  onInvoiceHoverLeave,
  searchTerm,
  sortColumn,
  onClearFilters,
}: InvoiceTableProps) {
  if (invoices.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center shadow-sm">
        <div className="text-gray-400 mb-4">
          <Receipt className="w-12 h-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No invoices found
        </h3>
        <p className="text-gray-600 mb-4">
          {searchTerm || sortColumn !== null
            ? "Try adjusting your search or filters."
            : "No invoices at this time."}
        </p>
        {(searchTerm || sortColumn !== null) && (
          <Button variant="outline" onClick={onClearFilters}>
            Clear Filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {creditLimitReady && isIntegrated && (
                <th className="px-2 sm:px-4 py-4 w-10">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={isAllVisibleSelected}
                      onCheckedChange={onToggleSelectAll}
                      disabled={visiblePendingIds.length === 0}
                    />
                  </div>
                </th>
              )}
              <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                Invoice
              </th>
              <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                Invoice Status
              </th>
              <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                VAT
              </th>
              <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                Created
              </th>
              <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                Amount
              </th>
              {showRequestTypeColumn && (
                <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                  Type
                </th>
              )}
              <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                Request Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoices.map((invoice, index) => (
              <tr
                key={`${invoice.id}-${invoice.status}-${index}`}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onMouseEnter={(e) => onInvoiceHover(invoice, e)}
                onMouseLeave={onInvoiceHoverLeave}
                onClick={() => onInvoiceClick(invoice)}
              >
                {creditLimitReady && isIntegrated && (
                  <td className="px-2 sm:px-4 py-4">
                    <Checkbox
                      checked={selectedInvoiceIds.includes(invoice.id)}
                      onCheckedChange={() =>
                        onToggleSelectOne(invoice.id, invoice.status)
                      }
                      disabled={
                        invoice.status !== "Pending" ||
                        (invoice.requestStatus || "Not Requested") !==
                        "Not Requested"
                      }
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                )}
                <td className="px-4 sm:px-6 py-4 font-medium text-gray-900 hover:text-gray-900">
                  {isIntegrated ? invoice.id : "—"}
                </td>
                <td className="px-4 sm:px-6 py-4">
                  {isIntegrated ? (
                    <Badge
                      variant="outline"
                      className={`${statusColors[invoice.status]
                        } font-medium`}
                    >
                      {invoice.status}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-slate-100 text-slate-500 border-slate-200 font-medium"
                    >
                      —
                    </Badge>
                  )}
                </td>
                <td className="px-4 sm:px-6 py-4 text-gray-600 hover:text-gray-600">
                  {isIntegrated ? (
                    invoice.customerVat ? (
                      <Sensitive>{invoice.customerVat}</Sensitive>
                    ) : (
                      "—"
                    )
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 sm:px-6 py-4 text-gray-600 hover:text-gray-600">
                  {isIntegrated ? (
                    <Sensitive>{invoice.created}</Sensitive>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 sm:px-6 py-4 font-semibold text-gray-900 hover:text-gray-900">
                  {isIntegrated ? (
                    <Sensitive>{invoice.amount}</Sensitive>
                  ) : (
                    "—"
                  )}
                </td>
                {showRequestTypeColumn && (
                  <td className="px-4 sm:px-6 py-4">
                    {isIntegrated ? (
                      invoice.requestType ? (
                        <Badge
                          variant="outline"
                          className={`${requestTypeColors[invoice.requestType]
                            } font-medium`}
                        >
                          {requestTypeLabels[invoice.requestType]}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-slate-100 text-slate-500 border-slate-200 font-medium"
                        >
                          —
                        </Badge>
                      )
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-slate-100 text-slate-500 border-slate-200 font-medium"
                      >
                        —
                      </Badge>
                    )}
                  </td>
                )}
                <td className="px-4 sm:px-6 py-4">
                  {isIntegrated ? (
                    <Badge
                      variant="outline"
                      className={`${requestStatusColors[
                        invoice.requestStatus || "Not Requested"
                      ]
                        } font-medium`}
                    >
                      {invoice.requestStatus || "Not Requested"}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-slate-100 text-slate-500 border-slate-200 font-medium"
                    >
                      —
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

