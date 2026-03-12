"use client";

import { useUser } from "@/components/user-context";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { CustomerPageWrapper } from "@/components/dashboard/customer-page-wrapper";
import { PageLayout } from "@/components/dashboard/page-layout";
import { PageContentSkeleton } from "@/components/dashboard/page-content-skeleton";
import { CUSTOMERS_DATA } from "@/lib/customers-data";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, CheckCircle, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getCustomersByStatus,
  searchCustomers,
  sortCustomers,
  type Customer,
} from "@/lib/customers-data";
import { BUYER_VAT } from "@/lib/config/dashboard-config";

// Lazy-load the customers component
const SimpleCustomersContent = dynamic(
  () =>
    import("@/components/simple-customers-content").then(
      (m) => m.SimpleCustomersContent
    ),
  { ssr: false }
);

function BusinessCustomersList() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"businessName" | "dateShared">(
    "dateShared"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const itemsPerPage = 10;

  // Calculate metrics from customer data
  const onboardedCustomers = CUSTOMERS_DATA.filter(
    (customer) => customer.status === "onboarded"
  ).length;
  const pendingCustomers = CUSTOMERS_DATA.filter(
    (customer) => customer.status === "new" || customer.status === "pending"
  ).length;
  const alertsEnabledCustomers = CUSTOMERS_DATA.filter(
    (customer) => customer.status === "onboarded" && customer.alertsEnabled
  ).length;

  // Filter and sort customers
  const filteredAndSortedCustomers = useMemo(() => {
    const filtered = searchCustomers(CUSTOMERS_DATA, searchTerm);
    return sortCustomers(filtered, sortBy, sortOrder);
  }, [searchTerm, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(
    filteredAndSortedCustomers.length / itemsPerPage
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCustomers = filteredAndSortedCustomers.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleSort = (column: "businessName" | "dateShared") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const handleCustomerClick = (customer: Customer) => {
    router.push(`/customers/${customer.vatNumber}`);
  };

  const handleAlertsClick = (
    e: React.MouseEvent,
    customerVatNumber: string
  ) => {
    e.stopPropagation();
    router.push(`/alerts?customer=${customerVatNumber}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    const initials = parts.slice(0, 2).map((part) => part[0]);
    return initials.join("").toUpperCase();
  };

  const getStatusBadge = (status: Customer["status"]) => {
    const statusConfig = {
      new: { label: "NEW", className: "bg-blue-100 text-blue-800" },
      onboarded: { label: "ONBOARDED", className: "bg-green-100 text-green-800" },
      pending: { label: "PENDING", className: "bg-orange-100 text-orange-800" },
    };

    const config = statusConfig[status];
    return (
      <Badge variant="secondary" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const newCustomersCount = getCustomersByStatus("new").length;

  return (
    <PageLayout
      title="Customers"
      description={`${newCustomersCount} new customer${newCustomersCount !== 1 ? "s" : ""
        }`}
    >

      {/* Metrics Cards */}
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Customers Onboarded */}
          <Card className="bg-white border-slate-200 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-slate-900">
                  {onboardedCustomers}
                </p>
                <p className="text-sm text-slate-600">
                  Total Customers Onboarded
                </p>
                <p className="text-xs text-green-600">
                  Successfully onboarded customers
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Total Customers Pending */}
          <Card className="bg-white border-slate-200 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
                <TrendingUp className="h-4 w-4 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-slate-900">
                  {pendingCustomers}
                </p>
                <p className="text-sm text-slate-600">
                  Total Customers Pending
                </p>
                <p className="text-xs text-orange-600">
                  Awaiting completion or approval
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Alerts Enabled Customers */}
          <Card className="bg-white border-slate-200 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Bell className="h-6 w-6 text-amber-600" />
                </div>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-slate-900">
                  {alertsEnabledCustomers}
                </p>
                <p className="text-sm text-slate-600">Active Buyer Alerts</p>
                <p className="text-xs text-green-600">
                  Monitoring onboarded customers
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="text"
          placeholder="Search by name, business, or VAT number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12 text-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                  <button
                    onClick={() => handleSort("businessName")}
                    className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                  >
                    <span>Business Name</span>
                    {sortBy === "businessName" && (
                      <span className="text-xs">
                        {sortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900 hidden lg:table-cell">
                  VAT Number
                </th>
                <th className="px-4 sm:px-6 py-4 text-right text-sm font-medium text-gray-900">
                  <button
                    onClick={() => handleSort("dateShared")}
                    className="flex items-center space-x-1 hover:text-blue-600 transition-colors ml-auto"
                  >
                    <span>Date Shared</span>
                    {sortBy === "dateShared" && (
                      <span className="text-xs">
                        {sortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-4 sm:px-6 py-4 text-right text-sm font-medium text-gray-900 hidden sm:table-cell">
                  Status
                </th>
                <th className="px-4 sm:px-6 py-4 text-center text-sm font-medium text-gray-900">
                  Enabled Alerts
                </th>
                <th className="px-4 sm:px-6 py-4 text-center text-sm font-medium text-gray-900">
                  Assignee
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  className="group hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleCustomerClick(customer)}
                >
                  <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">
                    <div
                      className="truncate max-w-[200px]"
                      title={customer.businessName}
                    >
                      {customer.businessName}
                    </div>
                    <div className="text-xs text-gray-400 lg:hidden truncate">
                      VAT: {customer.vatNumber}
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 hidden lg:table-cell">
                    <div
                      className="truncate max-w-[150px]"
                      title={customer.vatNumber}
                    >
                      {customer.vatNumber}
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 text-right">
                    <div className="text-right">
                      {formatDate(customer.dateShared)}
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right hidden sm:table-cell">
                    {getStatusBadge(customer.status as Customer["status"])}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-center">
                    {customer.status === "onboarded" &&
                      customer.alertsEnabled ? (
                      <button
                        onClick={(e) =>
                          handleAlertsClick(e, customer.vatNumber)
                        }
                        className="inline-flex items-center justify-center p-1 rounded-md hover:bg-amber-50 transition-colors"
                        title="View alerts for this customer"
                      >
                        <Bell className="w-5 h-5 text-amber-500 hover:text-amber-600 transition-colors" />
                      </button>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-700 ring-1 ring-inset ring-teal-200">
                          {getInitials(customer.assignedRep || "Unassigned")}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={6}>
                        {customer.assignedRep || "Unassigned"}
                      </TooltipContent>
                    </Tooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-4 sm:px-6 py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-700 text-center sm:text-left">
                Showing {startIndex + 1} to{" "}
                {Math.min(
                  startIndex + itemsPerPage,
                  filteredAndSortedCustomers.length
                )}{" "}
                of {filteredAndSortedCustomers.length} results
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

      {/* Empty State */}
      {filteredAndSortedCustomers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No customers found
          </h3>
          <p className="text-gray-600">
            Try adjusting your search terms or filters.
          </p>
        </div>
      )}
    </PageLayout>
  );
}

function BuyerCustomersManagement() {
  return (
    <CustomerPageWrapper
      vatNumber={BUYER_VAT}
      requires={["erp"]}
    >
      {() => (
        <PageLayout
          title="Customer Management"
          description="Manage your customer relationships and data"
        >
          <div className="space-y-4 sm:space-y-6">
            <Suspense fallback={<PageContentSkeleton />}>
              <SimpleCustomersContent />
            </Suspense>
          </div>
        </PageLayout>
      )}
    </CustomerPageWrapper>
  );
}

export default function CustomersPage() {
  const { userType } = useUser();

  if (userType === "buyer") {
    return <BuyerCustomersManagement />;
  }

  return <BusinessCustomersList />;
}
