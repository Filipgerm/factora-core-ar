"use client";

"use client";

import { Building, Mail, Phone, Link, CheckCircle, FileText, Download, Eye, Users, Wallet, TrendingUp, Pencil, X, Save, AlertTriangle, FileSpreadsheet, UploadCloud, Loader2, CreditCard, Shield } from "lucide-react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { type Customer, CUSTOMERS_DATA } from "@/lib/customers-data";
import { generateEmail, generatePhoneNumber } from "@/lib/utils/business_information_helpers";
import { assignCreditLimit } from "@/lib/utils/credit-limits";
import { getTopCustomersByPercentage } from "@/components/simple-customers-content";
import { useState } from "react";


// Only run this logic if CUSTOMERS_DATA is available
const CREDIT_REPORT_PDFS = CUSTOMERS_DATA.reduce(
    (acc, customer) => {
        acc[customer.vatNumber] = `/documents/credit-reports/${customer.vatNumber}.pdf`;
        return acc;
    },
    {} as Record<string, string>
);

const MISSING_CREDIT_REPORT_VATS = new Set([
    "GB123456789",
    "PL123456789",
    "GB555666777",
]);

const getCreditReportPdf = (vatNumber: string): string | undefined => {
    if (MISSING_CREDIT_REPORT_VATS.has(vatNumber)) {
        return undefined;
    }

    return CREDIT_REPORT_PDFS[vatNumber];
};


// Mapping functions for bank and ERP logos based on integration files
const getBankLogo = (bankName?: string) => {
    if (!bankName) return null;

    const bankMappings: Record<string, string> = {
        "Piraeus Bank": "/images/banks/piraeus-bank.png",
        "Alpha Bank": "/images/banks/alpha-bank.jpg",
        "National Bank of Greece": "/images/banks/nbg-bank.png",
        Eurobank: "/images/banks/euro-bank.png",
        Revolut: "/images/banks/revolut-bank.svg",
        N26: "/images/banks/n26-bank.png",
        Wise: "/images/banks/wise-bank.svg",
        ING: "/images/banks/ing-bank.png",
        "BNP Paribas": "/images/banks/bnp-paribas.png",
        "Deutsche Bank": "/images/banks/deutsche-bank.png",
        "Attica Bank": "/images/banks/attica-bank.png",
        "Credia Bank": "/images/banks/credia-bank.png",
        "Epirus Bank": "/images/banks/epirus-bank.png",
        "Optima Bank": "/images/banks/optima-bank.jpg",
        "Viva Bank": "/images/banks/viva-bank.png",
        Santander: "/images/banks/santander-bank.png",
        "Triodos Bank": "/images/banks/triodos-bank.png",
    };

    return bankMappings[bankName] || "/images/banks/default-bank.png";
};

// const getERPLogo = (erpName?: string) => {
//     if (!erpName) return null;

//     const erpMappings: Record<string, string> = {
//         ENTERSOFTONE: "/images/erps/entersoft.png",
//         "Epsilon Smart": "/images/erps/epsilon-smart.svg",
//         Semantic: "/images/erps/semantic.png",
//         QuickBooks: "/images/erps/qb.png",
//         Xero: "/images/erps/xero.svg",
//         Sage: "/images/erps/sage.svg",
//         SAP: "/images/erps/sap.png",
//         myDATA: "/images/erps/mydata.png",
//         Oracle: "/images/erps/oracle.png",
//         "Microsoft Dynamics": "/images/erps/dynamics.png",
//     };

//     return erpMappings[erpName] || "/images/erps/default-erp.png";
// };

// const getEcommercePlatformLogo = (platformName?: string) => {
//     if (!platformName) return null;

//     const platformMappings: Record<string, string> = {
//         Shopify: "/images/platforms/shopify-logo.png",
//         WooCommerce: "/images/platforms/woo-commerce-logo.png",
//         Magento: "/images/platforms/magento-logo.png",
//     };

//     return platformMappings[platformName] || "/images/platforms/shopify-logo.png";
// };

// --- COMPONENTS ---

// 1. Reusable Badge Component (Exported for use in Page Header)
interface CustomerStatusBadgeProps {
    status: Customer["status"];
    className?: string;
}

export const CustomerStatusBadge = ({ status, className }: CustomerStatusBadgeProps) => {
    const statusConfig = {
        new: { label: "NEW", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
        onboarded: { label: "ONBOARDED", className: "bg-green-100 text-green-800 hover:bg-green-100" },
        pending: { label: "PENDING", className: "bg-orange-100 text-orange-800 hover:bg-orange-100" },
    };

    const config = statusConfig[status] || statusConfig.new;

    return (
        <Badge variant="secondary" className={`${config.className} ${className || ""}`}>
            {config.label}
        </Badge>
    );
};




interface SummaryTabProps {
    customer: Customer;
    userType?: string;
}

export const SummaryTab = ({ customer, userType }: SummaryTabProps) => {

    const [isEditing, setIsEditing] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    const [isSyncingInsurance, setIsSyncingInsurance] = useState(false);
    const [showInsuranceSuccessToast, setShowInsuranceSuccessToast] = useState(false);

    const [formData, setFormData] = useState({
        businessName: customer.businessName,
        vatNumber: customer.vatNumber,
        address: "123 Business Street, Athens, Greece",
        billingAddress: "PO Box 456, Athens, Greece",
        incorporationDate: "15/03/2010",
        legalForm: "S.A.",
        email: generateEmail(customer.businessName),
        phone: generatePhoneNumber(customer.vatNumber, customer.id),
        creditLimit: assignCreditLimit(customer.vatNumber),
        paymentTerms: customer.paymentTerms || "Net 30",
    });

    const [showConfirmDialog, setShowConfirmDialog] = useState(false); // Toggle for popup

    const handleInputChange = (field: string, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveClick = () => {
        // Instead of saving directly, open the confirmation dialog
        setShowConfirmDialog(true);
    };

    const handleConfirmSave = () => {
        // This is where the actual API call would happen
        setIsEditing(false);
        setShowConfirmDialog(false);
        // Toast notification would go here: toast.success("Customer details updated successfully");
    };

    const handleCancel = () => {
        setFormData({
            businessName: customer.businessName,
            vatNumber: customer.vatNumber,
            address: "123 Business Street, Athens, Greece",
            billingAddress: "PO Box 456, Athens, Greece",
            incorporationDate: "15/03/2010",
            legalForm: "S.A.",
            email: generateEmail(customer.businessName),
            phone: generatePhoneNumber(customer.vatNumber, customer.id),
            creditLimit: assignCreditLimit(customer.vatNumber),
            paymentTerms: formData.paymentTerms,
        });
        setIsEditing(false);
    };

    const handleExportData = () => {
        const headers = ["Business Name", "VAT Number", "Address", "Billing Address", "Credit Limit", "Payment Terms", "Email", "Phone"];
        const row = [
            formData.businessName,
            formData.vatNumber,
            formData.address,
            formData.billingAddress,
            formData.creditLimit,
            formData.paymentTerms,
            formData.email,
            formData.phone
        ];

        // Helper to handle commas, quotes, and newlines safely
        const escapeCsvField = (field: string | number | null | undefined) => {
            if (field === null || field === undefined) return '';
            const stringValue = String(field);
            // Escape existing double quotes by doubling them (" -> "")
            const escaped = stringValue.replace(/"/g, '""');
            // Wrap the entire field in quotes to keep commas/newlines inside one cell
            return `"${escaped}"`;
        };

        const csvContent = [
            headers.map(escapeCsvField).join(","),
            row.map(escapeCsvField).join(",")
        ].join("\n");

        // Add Byte Order Mark (\uFEFF) so Excel opens it with correct UTF-8 encoding
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${formData.businessName.replace(/\s+/g, '_')}_profile.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSyncToERP = async () => {
        setIsSyncing(true);
        try {
            // SIMULATION: In production, this awaits an API call to your backend
            await new Promise(resolve => setTimeout(resolve, 1500));

            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 4000); // Auto-dismiss after 4s

            console.log("Synced to ERP:", formData);
        } catch (error) {
            console.error("ERP Sync Failed", error);
        } finally {
            setIsSyncing(false);
        }
    };

    // Instantiated a concomitant handler to process the insurance dispatch
    const handleSyncToInsurance = async () => {
        setIsSyncingInsurance(true);
        try {
            // SIMULATION: In production, this awaits an API call to your insurance provider's gateway
            await new Promise(resolve => setTimeout(resolve, 1500));

            setShowInsuranceSuccessToast(true);
            setTimeout(() => setShowInsuranceSuccessToast(false), 4000);

            console.log("Synced to Insurance:", formData);
        } catch (error) {
            console.error("Insurance Sync Failed", error);
        } finally {
            setIsSyncingInsurance(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const creditLimit = assignCreditLimit(customer.vatNumber);

    const getTopCustomersWithCreditLimits = () => {
        const topCustomers = getTopCustomersByPercentage(7);
        return topCustomers.map((customer) => ({
            businessName: customer.businessName,
            creditLimit: assignCreditLimit(customer.vat), // Use the passed vat or vatNumber depending on your data structure
        }));
    };

    const creditReportPdf = getCreditReportPdf(customer.vatNumber);
    const hasCreditReport = Boolean(creditReportPdf);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Confirmation Dialog */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600">
                            <AlertTriangle className="w-5 h-5" />
                            Confirm Changes
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            Are you sure you want to save these changes?
                            <br /><br />
                            Updating business details or <strong>Credit Limits</strong> will immediately affect the customer's standing and may trigger a compliance review.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        {/* 'Cancel' here just closes the dialog, returning the user to Edit Mode so they can correct mistakes. */}
                        <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-summary-accent hover:bg-summary-accent-hover text-white"
                            onClick={handleConfirmSave}
                        >
                            Confirm & Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Business Information - Takes 2/3 width */}
            <div className="lg:col-span-2">
                <Card className="overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                        <CardTitle className="flex items-center gap-2">
                            <Building className="w-5 h-5 text-summary-accent-muted" />
                            Business Information
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            {/* EXPORT BUTTON - ONLY VISIBLE WHEN NOT EDITING */}
                            {!isEditing && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleExportData}
                                    className="h-8 gap-2 text-gray-500 hover:text-gray-900"
                                    title="Export to CSV"
                                >
                                    <FileSpreadsheet className="w-4 h-4" />
                                    <span className="hidden sm:inline">Export</span>
                                </Button>
                            )}

                            {isEditing ? (
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCancel}
                                        className="h-8 gap-2 text-gray-500 hover:text-gray-700"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={handleSaveClick}
                                        className="h-8 gap-2 bg-summary-accent hover:bg-summary-accent-hover text-white"
                                    >
                                        <Save className="w-3.5 h-3.5" />
                                        Save Changes
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditing(true)}
                                    className="h-8 gap-2 text-gray-600"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                    Edit Details
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* FINANCIAL STANDING SECTION */}
                        <div className="rounded-xl bg-gradient-to-r from-summary-section-bg-start to-summary-section-bg-end border border-summary-section-border shadow-sm relative overflow-hidden">
                            {/* Background decoration */}
                            <div className="absolute top-0 right-0 -mt-2 -mr-2 h-24 w-24 rounded-full bg-summary-section-border/50 blur-xl"></div>

                            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-summary-section-divider/60">

                                {/* LEFT: Credit Limit */}
                                <div className="p-4 relative z-10">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs font-bold uppercase tracking-wider text-summary-accent flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" />
                                            Credit Limit
                                        </p>
                                        <Wallet className="w-4 h-4 text-summary-icon-muted" />
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        {isEditing ? (
                                            <div className="flex items-center gap-1">
                                                <span className="text-3xl font-bold text-gray-900">€</span>
                                                <input
                                                    type="number"
                                                    value={formData.creditLimit}
                                                    onChange={(e) => handleInputChange("creditLimit", parseInt(e.target.value) || 0)}
                                                    className="text-3xl font-bold text-gray-900 bg-white/50 border-b border-dashed border-gray-400 focus:outline-none focus:border-summary-focus-ring w-full max-w-[180px] bg-transparent p-0"
                                                />
                                            </div>
                                        ) : (
                                            <h3 className="text-3xl font-bold text-gray-900">
                                                €{formData.creditLimit.toLocaleString()}
                                            </h3>
                                        )}
                                    </div>
                                </div>

                                {/* RIGHT: Payment Terms (The "Couple") */}
                                <div className="p-4 relative z-10">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                                            <CreditCard className="w-3 h-3" />
                                            Payment Terms
                                        </p>
                                        <FileText className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <div className="flex items-baseline gap-2 h-[36px]"> {/* Fixed height to match text-3xl */}
                                        {isEditing ? (
                                            <select
                                                value={formData.paymentTerms}
                                                onChange={(e) => handleInputChange("paymentTerms", e.target.value)}
                                                className="text-2xl font-bold text-gray-900 bg-white/60 border border-gray-300 rounded px-1 -ml-1 focus:outline-none focus:ring-2 focus:ring-summary-focus-ring/20 w-full"
                                            >
                                                <option value="Prepaid">Prepaid</option>
                                                <option value="Net 15">Net 15</option>
                                                <option value="Net 30">Net 30</option>
                                                <option value="Net 60">Net 60</option>
                                            </select>
                                        ) : (
                                            <h3 className="text-3xl font-bold text-gray-900">
                                                {formData.paymentTerms}
                                            </h3>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* END FINANCIAL STANDING SECTION */}

                        {/* Main Identity Grouping */}
                        <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/60 p-5 transition-all duration-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-1 block">
                                        Business Name
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={formData.businessName}
                                            onChange={(e) => handleInputChange("businessName", e.target.value)}
                                            className="w-full text-lg font-semibold text-gray-900 bg-white border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-summary-focus-ring/20 focus:border-summary-focus-ring transition-all"
                                        />
                                    ) : (
                                        <p className="text-gray-900 font-semibold text-lg py-1.5 px-0.5">
                                            {formData.businessName}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1">
                                        VAT Number
                                        {isEditing && <Lock className="w-3 h-3 text-gray-400" />}
                                    </label>
                                    {isEditing ? (
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                value={formData.vatNumber}
                                                disabled
                                                className="w-full font-mono font-medium text-gray-500 bg-gray-100/50 border border-gray-200 rounded-md px-3 py-1 cursor-not-allowed"
                                            />
                                            <div className="absolute hidden group-hover:block top-full left-0 mt-1 text-xs text-white bg-gray-800 p-2 rounded shadow-lg z-10 whitespace-nowrap">
                                                Requires KYC re-verification to change
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-gray-900 font-mono font-medium py-1.5 px-0.5">
                                            {formData.vatNumber}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="h-px bg-gray-200/60 w-full" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-1 block">
                                        Business Address (HQ)
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={formData.address}
                                            onChange={(e) => handleInputChange("address", e.target.value)}
                                            className="w-full font-medium text-gray-900 bg-white border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-summary-focus-ring/20 focus:border-summary-focus-ring transition-all"
                                        />
                                    ) : (
                                        <p className="text-gray-900 font-medium py-1.5 px-0.5">
                                            {formData.address}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-1 block">
                                        Billing Address
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={formData.billingAddress}
                                            onChange={(e) => handleInputChange("billingAddress", e.target.value)}
                                            className="w-full font-medium text-gray-900 bg-white border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-summary-focus-ring/20 focus:border-summary-focus-ring transition-all"
                                        />
                                    ) : (
                                        <p className="text-gray-900 font-medium py-1.5 px-0.5">
                                            {formData.billingAddress}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-1">
                                <div className="flex-1 min-w-[200px]">
                                    <label className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-1 block">
                                        Incorporation Date
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={formData.incorporationDate}
                                            onChange={(e) => handleInputChange("incorporationDate", e.target.value)}
                                            className="w-full font-medium text-gray-900 bg-white border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-summary-focus-ring/20 focus:border-summary-focus-ring transition-all"
                                        />
                                    ) : (
                                        <p className="text-gray-900 font-medium py-1.5 px-0.5">
                                            {formData.incorporationDate}
                                        </p>
                                    )}
                                </div>
                                <div className="hidden h-8 w-px bg-gray-200 sm:block" />
                                <div className="flex-1 min-w-[200px]">
                                    <label className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-1 block">
                                        Legal Form
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={formData.legalForm}
                                            onChange={(e) => handleInputChange("legalForm", e.target.value)}
                                            className="w-full font-medium text-gray-900 bg-white border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-summary-focus-ring/20 focus:border-summary-focus-ring transition-all"
                                        />
                                    ) : (
                                        <p className="text-gray-900 font-medium py-1.5 px-0.5">
                                            {formData.legalForm}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Secondary Details */}
                        <div className="px-1">
                            <label className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                                Onboarded Date
                            </label>
                            <p className="text-gray-900 font-medium py-1">
                                {formatDate(customer.dateShared)}
                            </p>
                        </div>

                        <div className="px-1 border-t border-gray-50 pt-4">
                            <label className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-3 block">
                                Contact Information
                            </label>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-gray-900 font-medium">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
                                        <Mail className="w-4 h-4 text-gray-500" />
                                    </div>
                                    {isEditing ? (
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => handleInputChange("email", e.target.value)}
                                            className="w-full font-medium text-gray-900 bg-white border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-summary-focus-ring/20 focus:border-summary-focus-ring transition-all"
                                        />
                                    ) : (
                                        <span className="py-1.5">{formData.email}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-gray-900 font-medium">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
                                        <Phone className="w-4 h-4 text-gray-500" />
                                    </div>
                                    {isEditing ? (
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => handleInputChange("phone", e.target.value)}
                                            className="w-full font-medium text-gray-900 bg-white border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-summary-focus-ring/20 focus:border-summary-focus-ring transition-all"
                                        />
                                    ) : (
                                        <span className="py-1.5">{formData.phone}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
                {/* Connected Services */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Link className="w-5 h-5" />
                            Connected Services
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Bank Connection */}
                            {customer.connectedServices.bank ? (
                                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-white border border-gray-200 flex items-center justify-center">
                                            <img
                                                src={
                                                    getBankLogo(
                                                        customer.connectedServices.bankName
                                                    ) || "/images/banks/default-bank.png"
                                                }
                                                alt={
                                                    customer.connectedServices.bankName || "Bank"
                                                }
                                                className="w-6 h-6 object-contain"
                                            />
                                        </div>
                                        <div className="text-sm font-medium text-gray-900">
                                            {customer.connectedServices.bankName}
                                        </div>
                                    </div>
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-white border border-gray-200 flex items-center justify-center">
                                            <div className="w-6 h-6 bg-gray-300 rounded"></div>
                                        </div>
                                        <div className="text-sm font-medium text-gray-500">
                                            Bank: Not connected
                                        </div>
                                    </div>
                                    <div className="w-5 h-5 bg-gray-300 rounded-full"></div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Credit Report */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-summary-accent" />
                            Credit Report
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <p className="text-sm text-gray-500">
                                    Pulled from a partnered credit bureau
                                </p>
                                <p className="text-sm font-medium text-gray-900">
                                    {hasCreditReport
                                        ? "Report ready for review"
                                        : "Report not available yet"}
                                </p>
                            </div>
                            <Badge
                                className={
                                    hasCreditReport
                                        ? "bg-green-100 text-green-800"
                                        : "bg-gray-100 text-gray-600"
                                }
                            >
                                {hasCreditReport ? "Available" : "Not available"}
                            </Badge>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                            {hasCreditReport ? (
                                <Button asChild variant="outline">
                                    <a href={creditReportPdf} download>
                                        <span className="flex items-center gap-2">
                                            <Download className="w-4 h-4" />
                                            Download
                                        </span>
                                    </a>
                                </Button>
                            ) : (
                                <Button variant="outline" disabled>
                                    <span className="flex items-center gap-2">
                                        <Download className="w-4 h-4" />
                                        Download
                                    </span>
                                </Button>
                            )}

                            {hasCreditReport ? (
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <span className="flex items-center gap-2">
                                                <Eye className="w-4 h-4" />
                                                Preview
                                            </span>
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="flex h-[90vh] w-full flex-col gap-4 sm:max-w-6xl">
                                        <DialogHeader>
                                            <DialogTitle>Credit Report</DialogTitle>
                                        </DialogHeader>
                                        <div className="flex-1 overflow-hidden rounded-md border bg-white">
                                            <iframe
                                                src={creditReportPdf}
                                                title={`Credit report for ${customer.businessName}`}
                                                className="h-full w-full"
                                            />
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            ) : (
                                <Button disabled>
                                    <span className="flex items-center gap-2">
                                        <Eye className="w-4 h-4" />
                                        Preview
                                    </span>
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* MODIFIED: Transformed the ERP action block into a cohesive, stacked flex container to symmetrically accommodate both the ERP and Insurance triggers */}
                <div className="flex flex-col items-center gap-3 pt-6 pb-2">
                    <Button
                        variant="outline"
                        onClick={handleSyncToERP}
                        disabled={isSyncing || isSyncingInsurance}
                        className="w-full sm:w-3/4 h-11 gap-2 text-blue-700 bg-white hover:bg-blue-50 border-blue-200 shadow-sm transition-all text-base"
                    >
                        {isSyncing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Syncing with ERP...</span>
                            </>
                        ) : (
                            <>
                                <UploadCloud className="w-5 h-5" />
                                <span className="font-semibold">Push Profile to ERP</span>
                            </>
                        )}
                    </Button>

                    {/* MODIFIED: Added the Push to Insurance button with parallel geometric dimensions and localized thematic styling */}
                    <Button
                        variant="outline"
                        onClick={handleSyncToInsurance}
                        disabled={isSyncing || isSyncingInsurance}
                        className="w-full sm:w-3/4 h-11 gap-2 text-emerald-700 bg-white hover:bg-emerald-50 border-emerald-200 shadow-sm transition-all text-base"
                    >
                        {isSyncingInsurance ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Syncing with Insurance...</span>
                            </>
                        ) : (
                            <>
                                <Shield className="w-5 h-5" />
                                <span className="font-semibold">Push Profile to Insurance</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* ERP Success Toast */}
            <div
                className={`fixed bottom-6 right-6 z-50 transition-all duration-500 transform ease-out
                ${showSuccessToast ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}`}
            >
                <div className="flex items-center gap-4 px-6 py-4 bg-white/80 backdrop-blur-lg border border-summary-section-border/50 shadow-2xl rounded-2xl">
                    <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-summary-section-bg-start rounded-full border border-summary-section-border">
                        {/* Success Checkmark Icon */}
                        <svg className="w-5 h-5 text-summary-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">ERP Synchronization Complete</span>
                        <span className="text-xs text-gray-500 font-medium">Customer profile assigned to your ERP system.</span>
                    </div>

                    <button
                        onClick={() => setShowSuccessToast(false)}
                        className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Instantiated a concomitant toast overlay tailored for the Insurance context, dynamically rendering 90% of the computed credit limit as the 'Insured Limit' */}
            <div
                // Elevated position to prevent absolute geometric collision with the ERP toast
                className={`fixed bottom-28 right-6 z-50 transition-all duration-500 transform ease-out
                ${showInsuranceSuccessToast ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}`}
            >
                <div className="flex items-center gap-4 px-6 py-4 bg-white/90 backdrop-blur-lg border border-emerald-200 shadow-2xl rounded-2xl">
                    <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-emerald-50 rounded-full border border-emerald-200">
                        <Shield className="w-5 h-5 text-emerald-600" />
                    </div>

                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">Insurance Sync Complete</span>
                        <span className="text-xs text-gray-500 font-medium">
                            Profile secured. Insured Credit Limit: <strong className="text-emerald-700">€{(creditLimit * 0.5).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
                        </span>
                    </div>
                    <button
                        onClick={() => setShowInsuranceSuccessToast(false)}
                        className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};