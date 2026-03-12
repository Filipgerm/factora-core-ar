"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  TrendingUp,
  Users,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sensitive } from "@/components/ui/sensitive";
import { useChartAnimation } from "@/hooks/use-chart-animations";
import { VisibleWhen } from "@/components/visible-when";

const onboardingData = [
  { month: "Mar", value: 520 },
  { month: "Apr", value: 650 },
  { month: "May", value: 580 },
  { month: "Jun", value: 670 },
  { month: "Jul", value: 600 },
  { month: "Aug", value: 700 },
];

const suppliersData = [
  { month: "Mar", value: 1150 },
  { month: "Apr", value: 1230 },
  { month: "May", value: 1060 },
  { month: "Jun", value: 1102 },
  { month: "Jul", value: 1220 },
  { month: "Aug", value: 1100 },
];

const customerConcentration = {
  topCustomersPercentage: 49,
};

// Generate normally distributed random number using Box-Muller transform
// Mean: 35, Standard Deviation: 5
function generateNormalDistributedValue(seed: number, mean: number = 35, stdDev: number = 5): number {
  // Simple seeded random number generator
  const random1 = Math.sin(seed) * 10000;
  let u1 = Math.abs(random1 - Math.floor(random1));
  // Ensure u1 is not 0 to avoid -Infinity in log
  if (u1 === 0) u1 = 0.0001;
  if (u1 >= 1) u1 = 0.9999;

  const random2 = Math.sin(seed * 2 + 1) * 10000;
  const u2 = Math.abs(random2 - Math.floor(random2));

  // Box-Muller transform
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const value = mean + stdDev * z;

  // Clamp to reasonable range (20-50 days) and round to nearest integer
  return Math.max(20, Math.min(50, Math.round(value)));
}

// Generate normally distributed "Late" values using Box-Muller transform
// Mean: 5 days, Standard Deviation: 2 days
function generateLateValue(seed: number, mean: number = 5, stdDev: number = 2): number {
  // Simple seeded random number generator with different offset to ensure different values
  const random1 = Math.sin(seed * 3) * 10000;
  let u1 = Math.abs(random1 - Math.floor(random1));
  // Ensure u1 is not 0 to avoid -Infinity in log
  if (u1 === 0) u1 = 0.0001;
  if (u1 >= 1) u1 = 0.9999;

  const random2 = Math.sin(seed * 4 + 1) * 10000;
  const u2 = Math.abs(random2 - Math.floor(random2));

  // Box-Muller transform
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const value = mean + stdDev * z;

  // Clamp to reasonable range (0-15 days) and round to nearest integer
  // Negative days don't make sense, so minimum is 0
  return Math.max(0, Math.min(15, Math.round(value)));
}

// Helper function to generate construction-related business entries
const generateConstructionEntries = (
  count: number,
  relationshipType: "Customer" | "Supplier",
  startVat: number,
  startDate: Date
): Array<{
  businessName: string;
  vat: string;
  onboarded: string;
  country: string;
  type: "SME" | "SB";
  sector: string;
  relationshipType: "Customer" | "Supplier";
  spend: number;
  annualTurnover: number;
  invoiceCount: number;
  dso?: number;
  dpo?: number;
  late: number;
}> => {
  const countries = [
    "United Kingdom",
    "Germany",
    "France",
    "Italy",
    "Spain",
    "Netherlands",
    "Belgium",
    "Austria",
    "Sweden",
    "Denmark",
    "Finland",
    "Poland",
    "Czech Republic",
    "Hungary",
    "Romania",
    "Portugal",
    "Greece",
    "Ireland",
    "Estonia",
    "Lithuania",
  ];

  const sectors = [
    "Construction Materials",
    "Building Materials Distribution",
    "Construction Equipment",
    "Steel & Metal Construction",
    "Cement & Concrete Suppliers",
    "Timber & Wood Products",
    "Construction Materials Wholesale",
    "Roofing Materials",
    "Insulation Materials",
    "Flooring Materials",
    "HVAC Systems",
    "Electrical Components",
    "Plumbing Supplies",
    "Paint & Coatings",
    "Safety Equipment",
    "Heavy Machinery",
    "Scaffolding Solutions",
    "Glass & Windows",
    "Foundation Materials",
    "Landscaping Materials",
  ];

  const businessNames =
    relationshipType === "Supplier"
      ? [
        "Material Supply",
        "Construction Distributors",
        "Building Supplies",
        "Material Trading",
        "Construction Logistics",
        "Building Materials Network",
        "Supply Chain Solutions",
        "Material Partners",
        "Distribution Services",
        "Supply Experts",
        "Material Warehouse",
        "Building Supply",
        "Construction Supplies",
        "Material Distributors",
        "Supply Network",
        "Building Materials",
        "Material Trading Group",
        "Supply Partners",
        "Construction Materials",
        "Distribution Network",
      ]
      : [
        "Construction Builders",
        "Building Contractors",
        "Development Works",
        "Construction Projects",
        "Building Creations",
        "Construction Solutions",
        "Building Designs",
        "Development Group",
        "Construction Works",
        "Building Projects",
        "Development Solutions",
        "Construction Creations",
        "Building Works",
        "Construction Designs",
        "Development Builders",
        "Building Solutions",
        "Construction Group",
        "Development Services",
        "Building Creations",
        "Construction Projects",
      ];

  const entries = [];
  const currentDate = new Date(startDate);

  for (let i = 0; i < count; i++) {
    const vatNumber = (startVat + i).toString().padStart(9, "0");
    const country = countries[i % countries.length];
    const sector = sectors[i % sectors.length];
    const baseName = businessNames[i % businessNames.length];
    const companySuffix =
      country === "Germany" || country === "Austria"
        ? "GmbH"
        : country === "France" || country === "Belgium"
          ? "S.A."
          : country === "Spain" || country === "Portugal"
            ? "S.A."
            : country === "Italy"
              ? "S.r.l."
              : country === "Poland" || country === "Czech Republic"
                ? "Sp. z o.o."
                : country === "Netherlands"
                  ? "B.V."
                  : country === "Sweden" ||
                    country === "Norway" ||
                    country === "Denmark" ||
                    country === "Finland"
                    ? "AS"
                    : "Ltd";

    const businessName = `${baseName} ${companySuffix}`;

    // Increment date by 1-3 days randomly
    currentDate.setDate(currentDate.getDate() + (i % 3) + 1);
    const onboardedDate = currentDate.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const onboardedTime = `${(8 + (i % 8)).toString().padStart(2, "0")}:${(
      (i * 15) %
      60
    )
      .toString()
      .padStart(2, "0")} ${i % 2 === 0 ? "AM" : "PM"}`;
    const onboarded = `${onboardedDate}, ${onboardedTime}`;

    const baseSpend =
      relationshipType === "Supplier"
        ? 80000 + (i % 200) * 500
        : 5271.47 + (i % 20) * 150 + Math.floor(i / 5) * 200;
    const spend = baseSpend;
    const type: "SME" | "SB" = i % 2 === 0 ? "SME" : "SB";

    // Generate invoice count based on spend amount (higher spend = more invoices)
    // For suppliers: 10-45 invoices, for customers: 3-35 invoices
    const baseInvoiceCount =
      relationshipType === "Supplier"
        ? 10 + Math.floor((spend / 10000) % 35)
        : 3 + Math.floor((spend / 2000) % 32);
    const invoiceCount = Math.min(
      Math.max(baseInvoiceCount, relationshipType === "Supplier" ? 10 : 3),
      relationshipType === "Supplier" ? 45 : 35
    );

    // Generate DSO for Customers, DPO for Suppliers using normal distribution
    const seed = startVat + i;
    const daysValue = generateNormalDistributedValue(seed);
    // Generate Late value using normal distribution
    const lateValue = generateLateValue(seed);

    const entry: {
      businessName: string;
      vat: string;
      onboarded: string;
      country: string;
      type: "SME" | "SB";
      sector: string;
      relationshipType: "Customer" | "Supplier";
      spend: number;
      annualTurnover: number;
      invoiceCount: number;
      dso?: number;
      dpo?: number;
      late: number;
    } = {
      businessName,
      vat: vatNumber,
      onboarded,
      country,
      type,
      sector,
      relationshipType,
      spend,
      annualTurnover: spend,
      invoiceCount,
      late: lateValue,
    };

    if (relationshipType === "Customer") {
      entry.dso = daysValue;
    } else {
      entry.dpo = daysValue;
    }

    entries.push(entry);
  }

  return entries;
};

// Load raw data from JSON files
import existingCustomersRaw from '@/lib/data/existing-customers.json';
import existingSuppliersRaw from '@/lib/data/existing-suppliers.json';

// Apply runtime calculations for dso/dpo and late values
const existingCustomers = existingCustomersRaw.map((customer) => {
  const vatNumeric = parseInt(customer.vat.replace(/\D/g, ""), 10) || 0;
  return {
    ...customer,
    relationshipType: "Customer" as const,
    dso: generateNormalDistributedValue(vatNumeric),
    late: generateLateValue(vatNumeric),
  };
});

const existingSuppliers = existingSuppliersRaw.map((supplier) => {
  const vatNumeric = parseInt(supplier.vat.replace(/\D/g, ""), 10) || 0;
  return {
    ...supplier,
    relationshipType: "Supplier" as const,
    dpo: generateNormalDistributedValue(vatNumeric),
    late: generateLateValue(vatNumeric),
  };
});

// Generate 20 new suppliers
const newSuppliers = generateConstructionEntries(
  20,
  "Supplier",
  300000000,
  new Date("2025-08-25")
);

// Generate 26 new customers (19 existing + 26 new = 45 total customers)
const newCustomers = generateConstructionEntries(
  26,
  "Customer",
  400000000,
  new Date("2025-10-07")
);

// Combine all entries
const customersAndSuppliers = [
  ...existingCustomers,
  ...newCustomers,
  ...existingSuppliers,
  ...newSuppliers,
];

// Export customer data for use in other components
export { customersAndSuppliers };

// Export function to get top customers by percentage
export function getTopCustomersByPercentage(count: number = 7) {
  // Filter for customers only
  const customers = customersAndSuppliers.filter(
    (e) => e.relationshipType === "Customer"
  );

  // Calculate total customer turnover
  const totalCustomerTurnover = customers.reduce(
    (sum, e) => sum + e.annualTurnover,
    0
  );

  // Calculate percentage for each customer
  const customersWithPercentage = customers.map((customer) => ({
    ...customer,
    percentage: (customer.annualTurnover / totalCustomerTurnover) * 100,
  }));

  // Sort by percentage (descending) and take top N
  const topCustomers = customersWithPercentage
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, count);

  return topCustomers;
}

type RelationshipFilter = "Customer" | "Supplier";

type SortColumn =
  | "businessName"
  | "vat"
  | "invoices"
  | "spend"
  | "percentage"
  | "dso";

type SortDirection = "asc" | "desc";

const COLUMN_LABELS: Record<SortColumn, string> = {
  businessName: "Business Name",
  vat: "VAT",
  invoices: "Invoices",
  spend: "Spent",
  percentage: "%",
  dso: "DSO/DPO",
};

export function SimpleCustomersContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [relationshipFilter, setRelationshipFilter] =
    useState<RelationshipFilter>("Supplier");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const itemsPerPage = 10;
  const { containerRef, animateOnMount, animateBars, animateDonut } =
    useChartAnimation();

  const filteredEntries = customersAndSuppliers.filter((entry) => {
    const matchesSearch =
      entry.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.vat.includes(searchQuery) ||
      entry.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.relationshipType.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRelationship =
      entry.relationshipType === relationshipFilter;

    return matchesSearch && matchesRelationship;
  });

  // Calculate percentages for each entry
  const entriesWithPercentages = filteredEntries.map((entry) => {
    const totalCustomerTurnover = customersAndSuppliers
      .filter((e) => e.relationshipType === "Customer")
      .reduce((sum, e) => sum + e.annualTurnover, 0);

    const totalSupplierTurnover = customersAndSuppliers
      .filter((e) => e.relationshipType === "Supplier")
      .reduce((sum, e) => sum + e.annualTurnover, 0);

    const percentage =
      entry.relationshipType === "Customer"
        ? (entry.annualTurnover / totalCustomerTurnover) * 100
        : (entry.annualTurnover / totalSupplierTurnover) * 100;

    return {
      ...entry,
      percentage: percentage,
    };
  });

  // Handle column sorting
  const handleSort = (column: SortColumn) => {
    setSortColumn(column);
    setCurrentPage(1); // Reset to first page on sort change
  };

  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    setCurrentPage(1); // Reset to first page on sort change
  };

  // Sort entries based on current sort column and direction
  const sortedEntries = [...entriesWithPercentages].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: string | number;
    let bValue: string | number;

    switch (sortColumn) {
      case "businessName":
        aValue = a.businessName.toLowerCase();
        bValue = b.businessName.toLowerCase();
        break;
      case "vat":
        aValue = a.vat.toLowerCase();
        bValue = b.vat.toLowerCase();
        break;
      case "invoices":
        aValue = a.invoiceCount;
        bValue = b.invoiceCount;
        break;
      case "spend":
        aValue = a.spend;
        bValue = b.spend;
        break;
      case "percentage":
        aValue = a.percentage;
        bValue = b.percentage;
        break;
      case "dso":
        // Sort by DSO for customers, DPO for suppliers
        aValue = a.relationshipType === "Customer" ? a.dso ?? 0 : a.dpo ?? 0;
        bValue = b.relationshipType === "Customer" ? b.dso ?? 0 : b.dpo ?? 0;
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

  // Pagination logic
  const totalPages = Math.ceil(sortedEntries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEntries = sortedEntries.slice(startIndex, endIndex);

  // Reset to first page when filters or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, relationshipFilter, sortColumn, sortDirection]);

  const maxValue = Math.max(...onboardingData.map((d) => d.value));
  const maxSuppliersValue = Math.max(...suppliersData.map((d) => d.value));

  useEffect(() => {
    animateOnMount(".customers-title", { delay: 0.1 });
    animateOnMount(".analytics-card", { delay: 0.2, stagger: 0.1 });
    animateOnMount(".customers-table", { delay: 0.5 });

    // Animate charts after cards appear
    setTimeout(() => {
      animateBars(".suppliers-bar", 0.3);
      animateBars(".onboarding-bar", 0.5);
      animateDonut(".customer-concentration-donut", 0.7);
    }, 600);
  }, [animateOnMount, animateBars, animateDonut]);

  return (
    <div className="space-y-6 overflow-hidden" ref={containerRef}>
      {/* Analytics Cards */}
      <div className="analytics-cards grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total Suppliers */}
        <Card className="analytics-card bg-white border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Suppliers
            </CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent className="flex flex-col h-full">
            <div className="text-2xl font-bold text-[#071a33] mb-4">
              <Sensitive>22</Sensitive>
            </div>
            <div className="flex-1 min-h-0">
              {/* Simple Line Chart */}
              <div className="flex items-end justify-between h-full gap-1">
                {suppliersData.map((data, index) => (
                  <div
                    key={data.month}
                    className="flex flex-col items-center gap-1 flex-1 h-full"
                  >
                    <div className="flex-1 flex items-end">
                      <div
                        className="suppliers-bar bg-[#133b4f] w-4 rounded-t transition-all duration-1000 ease-out"
                        style={
                          {
                            height: `${(data.value / maxSuppliersValue) * 80}%`,
                            minHeight: "2px",
                            "--final-height": `${(data.value / maxSuppliersValue) * 80
                              }%`,
                          } as React.CSSProperties
                        }
                      />
                    </div>
                    <span className="text-xs text-slate-500 mt-2">
                      {data.month}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Customers */}
        <Card className="analytics-card bg-white border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Customers
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent className="flex flex-col h-full">
            <div className="text-2xl font-bold text-[#071a33] mb-4">
              <Sensitive>45</Sensitive>
            </div>
            <div className="flex-1 min-h-0">
              {/* Simple Line Chart */}
              <div className="flex items-end justify-between h-full gap-1">
                {onboardingData.map((data, index) => (
                  <div
                    key={data.month}
                    className="flex flex-col items-center gap-1 flex-1 h-full"
                  >
                    <div className="flex-1 flex items-end">
                      <div
                        className="onboarding-bar bg-[#2f9a8a] w-4 rounded-t transition-all duration-1000 ease-out"
                        style={
                          {
                            height: `${(data.value / maxValue) * 80}%`,
                            minHeight: "2px",
                            "--final-height": `${(data.value / maxValue) * 80
                              }%`,
                          } as React.CSSProperties
                        }
                      />
                    </div>
                    <span className="text-xs text-slate-500 mt-2">
                      {data.month}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Concentration */}
        <Card className="analytics-card bg-white border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Customer Concentration
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent className="overflow-auto">
            <div className="relative h-48 flex items-center justify-center">
              {/* Simple Donut Chart with CSS */}
              <div className="relative w-32 h-32">
                <svg
                  className="w-32 h-32 transform -rotate-90"
                  viewBox="0 0 36 36"
                >
                  <path
                    d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="3"
                  />
                  <path
                    className="customer-concentration-donut"
                    d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#2f9a8a"
                    strokeWidth="3"
                    strokeDasharray={`${customerConcentration.topCustomersPercentage}, 100`}
                    style={
                      {
                        "--final-offset": `${100 - customerConcentration.topCustomersPercentage
                          }`,
                      } as React.CSSProperties
                    }
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[#071a33]">
                      <Sensitive>
                        {customerConcentration.topCustomersPercentage}%
                      </Sensitive>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#2f9a8a]"></div>
                  <span className="text-sm font-medium text-slate-600">
                    Top 5 Customers
                  </span>
                </div>
                <span className="text-sm font-semibold text-[#071a33]">
                  <Sensitive>
                    {customerConcentration.topCustomersPercentage}%
                  </Sensitive>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#e2e8f0]"></div>
                  <span className="text-sm font-medium text-slate-600">
                    Other Customers
                  </span>
                </div>
                <span className="text-sm font-semibold text-[#071a33]">
                  <Sensitive>
                    {100 - customerConcentration.topCustomersPercentage}%
                  </Sensitive>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customers & Suppliers Table */}
      <Card className="customers-table bg-white border-0 shadow-sm">
        <CardHeader>
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-slate-600" />
                <CardTitle className="text-lg font-semibold text-[#071a33]">
                  Customers & Suppliers
                </CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#071a33] w-64"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white border-slate-200 text-slate-600 hover:bg-[#2f9a8a] hover:text-white hover:border-[#2f9a8a]"
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
                        "vat",
                        "invoices",
                        "spend",
                        "percentage",
                        "dso",
                      ] as SortColumn[]
                    ).map((column) => (
                      <DropdownMenuItem
                        key={column}
                        onClick={() => handleSort(column)}
                        className={
                          sortColumn === column
                            ? "bg-slate-100 font-medium"
                            : ""
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
              </div>
            </div>

            {/* Relationship Type Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-slate-600">View:</span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                <Button
                  variant={
                    relationshipFilter === "Customer" ? "default" : "ghost"
                  }
                  size="sm"
                  onClick={() => setRelationshipFilter("Customer")}
                  className={
                    relationshipFilter === "Customer"
                      ? "bg-white text-[#071a33] shadow-sm hover:bg-white"
                      : "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }
                >
                  Customers
                </Button>
                <Button
                  variant={
                    relationshipFilter === "Supplier" ? "default" : "ghost"
                  }
                  size="sm"
                  onClick={() => setRelationshipFilter("Supplier")}
                  className={
                    relationshipFilter === "Supplier"
                      ? "bg-white text-[#071a33] shadow-sm hover:bg-white"
                      : "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }
                >
                  Suppliers
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                    Business Name
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                    VAT
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                    Invoices
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                    {relationshipFilter === "Customer" ? "DSO (Avg.)" : "DPO (Avg.)"}
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                    Late
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                    Spent
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                    %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedEntries.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 sm:px-6 py-10 text-center text-gray-500 text-sm"
                      colSpan={7}
                    >
                      No rows
                    </td>
                  </tr>
                ) : (
                  paginatedEntries.map((entry, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 font-medium text-left">
                        <div>
                          <Sensitive>{entry.businessName}</Sensitive>
                          <div className="text-xs text-gray-500 mt-1">
                            {entry.sector}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 text-left">
                        <Sensitive>{entry.vat}</Sensitive>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 text-left">
                        <Sensitive>{entry.invoiceCount}</Sensitive>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 text-left">
                        <Sensitive>
                          {entry.relationshipType === "Customer"
                            ? entry.dso
                              ? `${entry.dso} Days`
                              : "—"
                            : entry.dpo
                              ? `${entry.dpo} Days`
                              : "—"}
                        </Sensitive>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 text-left">
                        <Sensitive>{entry.late} Days</Sensitive>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 text-left">
                        <Sensitive>€{entry.spend.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}</Sensitive>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 text-left">
                        <Sensitive>{entry.percentage.toFixed(2)}%</Sensitive>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
              <div className="flex items-center text-sm text-slate-600">
                <span>
                  Showing {startIndex + 1} to{" "}
                  {Math.min(endIndex, sortedEntries.length)} of{" "}
                  {sortedEntries.length} entries
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>

                <div className="flex items-center space-x-1">
                  {(() => {
                    // Calculate which pages to show (up to 3 pages)
                    let pagesToShow: number[] = [];

                    if (totalPages <= 3) {
                      // Show all pages if 3 or fewer
                      pagesToShow = Array.from(
                        { length: totalPages },
                        (_, i) => i + 1
                      );
                    } else {
                      // Show 3 pages centered around current page
                      if (currentPage === 1) {
                        // First page: show 1, 2, 3
                        pagesToShow = [1, 2, 3];
                      } else if (currentPage === totalPages) {
                        // Last page: show last 3 pages
                        pagesToShow = [
                          totalPages - 2,
                          totalPages - 1,
                          totalPages,
                        ];
                      } else {
                        // Middle pages: show current-1, current, current+1
                        pagesToShow = [
                          currentPage - 1,
                          currentPage,
                          currentPage + 1,
                        ];
                      }
                    }

                    return pagesToShow.map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 p-0 ${currentPage === page
                          ? "bg-[#071a33] text-white hover:bg-[#071a33]"
                          : "bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                      >
                        {page}
                      </Button>
                    ));
                  })()}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
