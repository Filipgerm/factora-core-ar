"use client";

import { useMemo, useState } from "react";
import { Clock, User, RefreshCw, CheckCircle, FileText, AlertCircle, Search } from "lucide-react";
import { motion } from "framer-motion";

import { type Customer, SALES_REPS } from "@/lib/customers-data";
import { assignCreditLimit } from "@/lib/utils/credit-limits";

type HistoryEventType = "limit_change" | "sync" | "approval" | "review";
type HistoryEventStatus = "success" | "warning" | "info";

interface HistoryEvent {
    id: number;
    type: HistoryEventType;
    title: string;
    description: string;
    user: string;
    userRole: string;
    timestamp: string;
    status: HistoryEventStatus;
    metadata?: Record<string, number | string>;
}

const getEventStyles = (status: HistoryEventStatus) => {
    switch (status) {
        case "success":
            return "bg-green-50 ring-green-100 text-green-600";
        case "warning":
            return "bg-orange-50 ring-orange-100 text-orange-600";
        case "info":
            return "bg-blue-50 ring-blue-100 text-blue-600";
        default:
            return "bg-gray-50 ring-gray-100 text-gray-600";
    }
};

const getEventIcon = (type: HistoryEventType) => {
    switch (type) {
        case "limit_change":
            return <FileText className="w-4 h-4" />;
        case "sync":
            return <RefreshCw className="w-4 h-4" />;
        case "approval":
            return <CheckCircle className="w-4 h-4" />;
        case "review":
            return <AlertCircle className="w-4 h-4" />;
        default:
            return <Clock className="w-4 h-4" />;
    }
};

const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    const initials = parts.slice(0, 2).map((part) => part[0]);
    return initials.join("").toUpperCase();
};

const formatHistoryDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
};

const formatHistoryTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
};



const buildHistoryEvents = (customer: Customer): HistoryEvent[] => {
    const baseDate = new Date(customer.dateShared);
    const repIndex = Math.max(0, SALES_REPS.indexOf(customer.assignedRep ?? ""));
    const getRepByOffset = (offset: number) =>
        SALES_REPS[(repIndex + offset) % SALES_REPS.length] || SALES_REPS[0];
    const primaryRep = customer.assignedRep || SALES_REPS[0];
    const secondaryRep = getRepByOffset(1);
    const reviewerRep = getRepByOffset(2);
    const daySeed = customer.id % 4;

    const makeTimestamp = (daysBack: number) => {
        const date = new Date(baseDate);
        date.setDate(date.getDate() - (daysBack + daySeed));
        date.setHours(9 + ((customer.id + daysBack) % 8), (customer.id * 7) % 60, 0);
        return date.toISOString();
    };

    const creditLimit = assignCreditLimit(customer.vatNumber);
    const delta = (customer.id % 3 + 1) * 5000;
    const previousLimit = Math.max(creditLimit - delta, 5000);

    const events: HistoryEvent[] = [];

    if (customer.status === "onboarded") {
        // 1. Initial Bureau Check (happens prior to approval)
        events.push({
            id: 101,
            type: "review",
            title: "Bureau Audit (Tiresias)",
            description: `Initial legal and solvency standing verification via Tiresias.`,
            user: "System",
            userRole: "Compliance Engine",
            timestamp: makeTimestamp(405), // Approx 1 year + 1 month ago
            status: "success",
        });

        // 2. Application Approved (happens shortly after initial check)
        events.push({
            id: 1,
            type: "approval",
            title: "Credit Application Approved",
            description: `${customer.businessName} approved for onboarding and credit access.`,
            user: primaryRep,
            userRole: "Senior Credit Analyst",
            timestamp: makeTimestamp(400), // Approx 1 year + 1 month ago (5 days after audit)
            status: "success",
        });

        // 3. Annual Bureau Check
        events.push({
            id: 100,
            type: "review",
            title: "Annual Bureau Audit (Tiresias)",
            description: `Verified legal and solvency standing via Tiresias for annual risk compliance.`,
            user: "System",
            userRole: "Compliance Engine",
            timestamp: makeTimestamp(30), // Approx a month ago
            status: "success",
        });

        // 4. Recent limit update (potentially due to clean annual review)
        events.push({
            id: 2,
            type: "limit_change",
            title: "Credit Limit Updated",
            description: `Credit limit adjusted for ${customer.businessName}.`,
            user: secondaryRep,
            userRole: "Account Manager",
            timestamp: makeTimestamp(6), // 6 days ago
            status: "success",
            metadata: {
                previous: previousLimit,
                current: creditLimit,
                currency: "EUR",
            },
        });
    } else {
        // If not onboarded, a manual review is initiated recently
        events.push({
            id: 3,
            type: "review",
            title: "Manual Review Initiated",
            description: "Financial statements flagged for secondary review.",
            user: reviewerRep,
            userRole: "Risk Manager",
            timestamp: makeTimestamp(3),
            status: "warning",
        });
    }

    // 5. Data Syncing Engine (applies to all customers with connected services)
    const connectedServiceName =
        customer.connectedServices.erpName ||
        customer.connectedServices.bankName ||
        customer.connectedServices.ecommerceName ||
        "Connected Service";

    const syncTitle = customer.connectedServices.erp
        ? "ERP Sync Completed"
        : customer.connectedServices.bank
            ? "Banking Sync Completed"
            : customer.connectedServices.ecommerce
                ? "E-commerce Sync Completed"
                : "Data Sync Scheduled";

    const syncDescription =
        customer.connectedServices.erp ||
            customer.connectedServices.bank ||
            customer.connectedServices.ecommerce
            ? `${connectedServiceName} data refreshed for ${customer.businessName}.`
            : "Awaiting connection to pull financial data.";

    events.push({
        id: 4,
        type: "sync",
        title: syncTitle,
        description: syncDescription,
        user: "System",
        userRole: "Data Operations",
        timestamp: makeTimestamp(9), // 9 days ago
        status: "info",
    });

    events.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return events;
};


export const HistoryTab = ({ customer }: { customer: Customer }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const events = useMemo(() => buildHistoryEvents(customer), [customer]);
    const filteredEvents = useMemo(() => {
        if (!searchTerm.trim()) {
            return events;
        }

        const query = searchTerm.toLowerCase();
        return events.filter(
            (event) =>
                event.title.toLowerCase().includes(query) ||
                event.description.toLowerCase().includes(query) ||
                event.user.toLowerCase().includes(query)
        );
    }, [events, searchTerm]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search activity history..."
                        className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                    />
                </div>
                <div className="text-xs font-medium text-gray-500">
                    {filteredEvents.length} event
                    {filteredEvents.length !== 1 ? "s" : ""}
                </div>
            </div>

            <div className="relative">
                <div className="absolute left-[136px] top-6 bottom-6 w-px bg-gradient-to-b from-gray-200 via-gray-200 to-transparent" />
                <div className="space-y-4">
                    {filteredEvents.map((event) => (
                        <div
                            key={event.id}
                            className="relative grid grid-cols-[96px_48px_1fr] items-center gap-4"
                        >
                            <div className="w-24 pr-2 text-right self-center">
                                <div className="text-[11px] font-semibold text-gray-900 uppercase tracking-tight">
                                    {formatHistoryDate(event.timestamp)}
                                </div>
                                <div className="text-[10px] text-gray-400 font-medium font-mono">
                                    {formatHistoryTime(event.timestamp)}
                                </div>
                            </div>

                            <div className="relative z-10 flex h-12 w-12 items-center justify-center">
                                <div
                                    className={`flex h-10 w-10 items-center justify-center rounded-full ring-4 shadow-sm bg-white ${getEventStyles(
                                        event.status
                                    )}`}
                                >
                                    {getEventIcon(event.type)}
                                </div>
                            </div>

                            <div className="flex-1">
                                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="space-y-1">
                                            <h4 className="text-[15px] font-semibold text-gray-900">
                                                {event.title}
                                            </h4>
                                            <p className="text-sm text-gray-500">
                                                {event.description}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 sm:border-l sm:border-gray-100 sm:pl-4">
                                            <div className="text-right">
                                                <div className="text-xs font-semibold text-gray-800">
                                                    {event.user}
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-tight">
                                                    {event.userRole}
                                                </div>
                                            </div>
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary-subtle text-brand-primary ring-1 ring-inset ring-brand-primary-border text-xs font-semibold">
                                                {getInitials(event.user)}
                                            </div>
                                        </div>
                                    </div>

                                    {event.metadata && (
                                        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-50 pt-4">
                                            {Object.entries(event.metadata).map(([key, value]) => (
                                                <span
                                                    key={key}
                                                    className="rounded-full border border-gray-100 bg-gray-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500"
                                                >
                                                    {key}: {value}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredEvents.length === 0 && (
                        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
                            No history events found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};