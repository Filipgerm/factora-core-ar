"use client";

import { useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, UploadCloud, CheckCircle2, ArrowRight, X, FileText } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import Image from "next/image";
import { PoweredByFooter } from "@/components/PoweredByFooter";
import { useOnboardingRouting } from "@/hooks/use-onboarding-routing";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DynamicBrandLogo } from "@/components/DynamicBrandLogo";

const SUB_STEPS = [
    { id: "job", title: "Job Details" },
    { id: "contractor", title: "Contractor Details" },
    { id: "ownership", title: "Ownership & Funding" }
];

const AestheticInput = ({ label, placeholder, value, field, type = "text", onChange }: any) => {
    return (
        <div className="space-y-2 w-full">
            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">{label}</Label>
            <Input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(field, e.target.value)}
                className="h-12 bg-white/70 border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-1 focus:ring-brand-primary/30 focus:border-brand-primary transition-all text-sm rounded-lg shadow-sm placeholder:text-slate-400"
            />
        </div>
    );
};

export default function JobSheetPage() {
    const pathname = usePathname();
    const currentStepId = pathname.split("/").filter(Boolean).pop() || "";
    const { goToNextStep, goToPreviousStep } = useOnboardingRouting(currentStepId);
    const { locale } = useI18n();

    const [activeStep, setActiveStep] = useState(0);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        // 1. Job Details
        jobName: "Kifisias Business Center (RE-ATH-2025-017)",
        jobDescription: "",
        jobCategory: "private", // "public" | "private"
        publicProcurementRef: "", // Universal analog to ΑΔΑΜ
        publicAwardRef: "",       // Universal analog to ΑΔΑ
        privateBuildingPermit: "", // Universal analog to Αρ. Οικοδομικής Άδειας
        privateContractRef: "",    // Universal analog to Αρ. Πρωτ. TaxisNet
        purchaseAmount: "",
        requestedCreditLimit: "",
        paymentMethod: "",
        retentionPercentage: "",
        startDate: "",
        endDate: "",
        jobCountry: "",
        jobCity: "",
        jobStreet: "",
        jobZip: "",

        // 2. Contractor Details
        contractorRole: "",
        gcName: "Alpha Construction S.A.",
        gcVat: "999999999",
        gcEmail: "",
        gcPhone: "",
        gcCountry: "",
        gcCity: "",
        gcStreet: "",
        gcZip: "",

        // 3. Ownership & Funding
        ownerName: "Hellenic Properties Ltd",
        ownerVat: "999999999",
        ownerEmail: "",
        ownerPhone: "",
        ownerCountry: "",
        ownerCity: "",
        ownerStreet: "",
        ownerZip: "",

        financedBy: "Example S.A.",
        financedByVat: "999999999",
        fundingEmail: "",
        fundingPhone: "",
        fundingCountry: "",
        fundingCity: "",
        fundingStreet: "",
        fundingZip: "",
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleNext = () => {
        if (activeStep < SUB_STEPS.length - 1) {
            setActiveStep(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            goToNextStep();
        }
    };

    const handleBack = () => {
        if (activeStep > 0) {
            setActiveStep(prev => prev - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            goToPreviousStep();
        }
    };

    const handleBoxClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setUploadedFiles((prev) => [...prev, ...newFiles]);
        }
        // Reset input value to allow uploading the same file again if it was removed
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const removeFile = (indexToRemove: number) => {
        setUploadedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
    };
    const datePlaceholder = locale === 'el' ? 'ηη/μμ/εεεε' : 'dd/mm/yyyy';

    return (
        <div className="fixed inset-0 flex flex-col bg-[#FAFAFA] z-40 overflow-hidden">
            {/* HEADER SECTION */}
            <div className="flex-shrink-0 bg-brand-surface pt-4 pb-6 px-6 shadow-md z-50 relative">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex-1 flex justify-start">
                        <button
                            type="button"
                            onClick={handleBack}
                            className="group flex items-center gap-3 transition-all"
                        >
                            <div className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-700 bg-slate-800 text-slate-300 shadow-sm transition-colors group-hover:border-brand-primary group-hover:text-brand-primary">
                                <ArrowLeft className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-medium text-slate-300 transition-colors hidden sm:block group-hover:text-white">
                                Back
                            </span>
                        </button>
                    </div>

                    <div className="flex flex-col items-center flex-shrink-0 gap-1">
                        <DynamicBrandLogo className="relative w-40 h-16 md:w-48" />
                        {/*  Job-Sheet title directly below the logo */}
                        <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                            Job-Sheet
                        </h1>
                    </div>


                    <div className="flex-1 flex justify-end text-white">
                        <LanguageSwitcher />
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT SPLIT VIEW */}
            <div className="flex-1 flex flex-col lg:flex-row max-w-[1400px] w-full mx-auto overflow-hidden">

                {/* LEFT SIDEBAR: Dynamic Progress Headers */}
                <div className="w-full lg:w-1/3 p-8 lg:p-16 flex flex-col justify-center shrink-0">
                    <div className="space-y-4">
                        {SUB_STEPS.map((step, idx) => {
                            const isActive = idx === activeStep;
                            const isPast = idx < activeStep;

                            return (
                                <div
                                    key={step.id}
                                    onClick={() => isPast && setActiveStep(idx)}
                                    className={`relative pl-6 py-4 transition-all duration-500 ease-in-out ${isActive ? "border-l-4 border-brand-primary" : "border-l-4 border-transparent cursor-pointer"
                                        }`}
                                >
                                    {isActive ? (
                                        <motion.h2
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1]"
                                        >
                                            {step.title.split(' ').map((word, i) => (
                                                <span key={i} className="block">{word}</span>
                                            ))}
                                        </motion.h2>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <div className={`w-1.5 h-1.5 rounded-full ${isPast ? 'bg-brand-primary' : 'bg-slate-300'}`} />
                                            <span className={`text-sm lg:text-base font-semibold ${isPast ? 'text-slate-600 hover:text-brand-primary' : 'text-slate-400'}`}>
                                                {step.title}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT CONTENT: Smooth Animated Forms */}
                <div className="w-full lg:w-2/3 p-6 lg:p-12 overflow-y-auto">
                    <AnimatePresence mode="wait">

                        {/* STEP 0: JOB DETAILS */}
                        {activeStep === 0 && (
                            <motion.div
                                key="step-0"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                className="max-w-2xl mx-auto space-y-8 pb-20"
                            >
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 lg:p-10">
                                    <div className="space-y-8">
                                        <div className="space-y-6">
                                            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Job Information</h3>
                                            <AestheticInput label="Project Name *" placeholder="e.g. Parker Plaza (4500YS)" value={formData.jobName} field="jobName" onChange={handleChange} />
                                            <AestheticInput label="Description" placeholder="e.g. Single story shopping plaza" value={formData.jobDescription} field="jobDescription" onChange={handleChange} />

                                            {/* Job Category Selector */}
                                            <div className="space-y-2 pt-2">
                                                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Job Category</Label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleChange('jobCategory', 'public')}
                                                        className={`h-12 rounded-lg text-sm font-semibold transition-all border ${formData.jobCategory === 'public' ? 'border-brand-primary bg-brand-primary-subtle text-brand-primary shadow-sm' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                                    >
                                                        Public Project
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleChange('jobCategory', 'private')}
                                                        className={`h-12 rounded-lg text-sm font-semibold transition-all border ${formData.jobCategory === 'private' ? 'border-brand-primary bg-brand-primary-subtle text-brand-primary shadow-sm' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                                    >
                                                        Private Project
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Conditional Regulatory Fields based on Category */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                                {formData.jobCategory === 'public' ? (
                                                    <>
                                                        <AestheticInput label="Tender Reference (e.g. ΑΔΑΜ)" placeholder="e.g. 23REQ01234567" value={formData.publicProcurementRef} field="publicProcurementRef" onChange={handleChange} />
                                                        <AestheticInput label="Award Decision (e.g. ΑΔΑ)" placeholder="e.g. 9ΧΧΧ46Ψ842-123" value={formData.publicAwardRef} field="publicAwardRef" onChange={handleChange} />
                                                    </>
                                                ) : (
                                                    <>
                                                        <AestheticInput label="Building Permit No." placeholder="e.g. 12345/2023" value={formData.privateBuildingPermit} field="privateBuildingPermit" onChange={handleChange} />
                                                        <AestheticInput label="Contract Registration No." placeholder="e.g. TaxisNet Protocol No." value={formData.privateContractRef} field="privateContractRef" onChange={handleChange} />
                                                    </>
                                                )}
                                            </div>

                                            {/* Expanded Financial Information */}
                                            <div className="grid grid-cols-2 gap-4 pt-2">
                                                <AestheticInput label="Purchase Amount (€)" placeholder="e.g. 35000" type="number" value={formData.purchaseAmount} field="purchaseAmount" onChange={handleChange} />
                                                <AestheticInput label="Requested Credit Limit (€)" placeholder="e.g. 20000" type="number" value={formData.requestedCreditLimit} field="requestedCreditLimit" onChange={handleChange} />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2 w-full">
                                                    <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Payment Method</Label>
                                                    <Select value={formData.paymentMethod} onValueChange={(val) => handleChange("paymentMethod", val)}>
                                                        <SelectTrigger className="h-12 bg-white/70 border-slate-200 hover:border-slate-300 focus:ring-1 focus:ring-brand-primary/30 focus:border-brand-primary text-sm rounded-lg shadow-sm">
                                                            <SelectValue placeholder="Select method..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="certification">Certification Based (Milestones)</SelectItem>
                                                            <SelectItem value="time">Time Based (Periodic)</SelectItem>
                                                            <SelectItem value="delivery">Upon Final Delivery</SelectItem>
                                                            <SelectItem value="other">Other</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <AestheticInput label="Retention Money (%)" placeholder="e.g. 5" type="number" value={formData.retentionPercentage} field="retentionPercentage" onChange={handleChange} />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <AestheticInput label="Start Date" type="text" placeholder={datePlaceholder} value={formData.startDate} field="startDate" onChange={handleChange} />
                                                <AestheticInput label="End Date" type="text" placeholder={datePlaceholder} value={formData.endDate} field="endDate" onChange={handleChange} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 1: CONTRACTOR DETAILS */}
                        {activeStep === 1 && (
                            <motion.div
                                key="step-1"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                className="max-w-2xl mx-auto space-y-8 pb-20"
                            >
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 lg:p-10">
                                    <div className="space-y-8">
                                        <div className="space-y-6">
                                            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Contracting Structure</h3>
                                            <AestheticInput label="Your Role" placeholder="e.g. Subcontractor" value={formData.contractorRole} field="contractorRole" onChange={handleChange} />
                                        </div>

                                        <div className="space-y-6 pt-2">
                                            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">General Contractor Details</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <AestheticInput label="GC Name" placeholder="e.g. Alpha Construction S.A." value={formData.gcName} field="gcName" onChange={handleChange} />
                                                <AestheticInput label="VAT Number *" placeholder="e.g. 999999999" value={formData.gcVat} field="gcVat" onChange={handleChange} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <AestheticInput label="Email" placeholder="e.g. contact@alphaconstruct.gr" type="email" value={formData.gcEmail} field="gcEmail" onChange={handleChange} />
                                                <AestheticInput label="Phone Number" placeholder="e.g. +30 210 123 4567" type="tel" value={formData.gcPhone} field="gcPhone" onChange={handleChange} />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <AestheticInput label="Country" placeholder="e.g. Greece" value={formData.gcCountry} field="gcCountry" onChange={handleChange} />
                                                <AestheticInput label="City" placeholder="e.g. Athens" value={formData.gcCity} field="gcCity" onChange={handleChange} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <AestheticInput label="Street Address" placeholder="e.g. Ermou 15" value={formData.gcStreet} field="gcStreet" onChange={handleChange} />
                                                <AestheticInput label="Zip Code" placeholder="e.g. 10563" value={formData.gcZip} field="gcZip" onChange={handleChange} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 2: OWNERSHIP & FUNDING */}
                        {activeStep === 2 && (
                            <motion.div
                                key="step-2"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                className="max-w-2xl mx-auto space-y-8 pb-20"
                            >
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 lg:p-10">
                                    <div className="space-y-8">
                                        <div className="space-y-6">
                                            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Property Owner</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <AestheticInput label="Owner Name" placeholder="e.g. Hellenic Properties Ltd" value={formData.ownerName} field="ownerName" onChange={handleChange} />
                                                <AestheticInput label="VAT Number *" placeholder="e.g. 999999999" value={formData.ownerVat} field="ownerVat" onChange={handleChange} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <AestheticInput label="Email" placeholder="e.g. owner@hellenicprop.gr" type="email" value={formData.ownerEmail} field="ownerEmail" onChange={handleChange} />
                                                <AestheticInput label="Phone Number" placeholder="e.g. +30 210 987 6543" type="tel" value={formData.ownerPhone} field="ownerPhone" onChange={handleChange} />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <AestheticInput label="Country" placeholder="e.g. Greece" value={formData.ownerCountry} field="ownerCountry" onChange={handleChange} />
                                                <AestheticInput label="City" placeholder="e.g. Thessaloniki" value={formData.ownerCity} field="ownerCity" onChange={handleChange} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <AestheticInput label="Street Address" placeholder="e.g. Tsimiski 22" value={formData.ownerStreet} field="ownerStreet" onChange={handleChange} />
                                                <AestheticInput label="Zip Code" placeholder="e.g. 54624" value={formData.ownerZip} field="ownerZip" onChange={handleChange} />
                                            </div>
                                        </div>

                                        <div className="space-y-6 pt-2">
                                            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Funding Information</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <AestheticInput label="Financed By" placeholder="e.g. Eurobank S.A." value={formData.financedBy} field="financedBy" onChange={handleChange} />
                                                <AestheticInput label="VAT Number *" placeholder="e.g. 999999999" value={formData.financedByVat} field="financedByVat" onChange={handleChange} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <AestheticInput label="Email" placeholder="e.g. projectfinance@eurobank.gr" type="email" value={formData.fundingEmail} field="fundingEmail" onChange={handleChange} />
                                                <AestheticInput label="Phone Number" placeholder="e.g. +30 210 333 3333" type="tel" value={formData.fundingPhone} field="fundingPhone" onChange={handleChange} />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <AestheticInput label="Country" placeholder="e.g. Greece" value={formData.fundingCountry} field="fundingCountry" onChange={handleChange} />
                                                <AestheticInput label="City" placeholder="e.g. Athens" value={formData.fundingCity} field="fundingCity" onChange={handleChange} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <AestheticInput label="Street Address" placeholder="e.g. Othonos 8" value={formData.fundingStreet} field="fundingStreet" onChange={handleChange} />
                                                <AestheticInput label="Zip Code" placeholder="e.g. 10557" value={formData.fundingZip} field="fundingZip" onChange={handleChange} />
                                            </div>
                                        </div>

                                        {/* Upload Documents Box */}
                                        <div className="pt-2">
                                            <h3 className="text-base font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3">Supporting Documents</h3>
                                            {/* Ephemeral hidden input structurally mapped to the React ref */}
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                multiple
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={handleFileChange}
                                            />

                                            {/* Appended onClick handler to the interactive zone */}
                                            <div
                                                onClick={handleBoxClick}
                                                className="border border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 hover:border-brand-primary transition-colors cursor-pointer group"
                                            >
                                                <div className="p-4 bg-white rounded-full shadow-sm mb-4 group-hover:scale-105 transition-transform border border-slate-100">
                                                    <UploadCloud className="w-5 h-5 text-brand-primary" />
                                                </div>
                                                <p className="text-sm font-medium text-slate-900">Upload Project Documentation</p>
                                                <p className="text-xs text-slate-500 mt-1">Funding agreements, ISO Certifications, Financials, etc.</p>
                                                <p className="text-xs text-slate-400 mt-1">PDF, JPG up to 10MB</p>
                                            </div>

                                            {/* Concomitant rendering of ingested artifacts */}
                                            {uploadedFiles.length > 0 && (
                                                <div className="mt-4 space-y-2">
                                                    {uploadedFiles.map((file, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 shadow-sm rounded-lg text-sm group transition-all hover:border-brand-primary/50">
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                <FileText className="w-4 h-4 text-brand-primary flex-shrink-0" />
                                                                <span className="truncate text-slate-700 font-medium">
                                                                    {file.name}
                                                                </span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeFile(idx);
                                                                }}
                                                                className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0 ml-2"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* DYNAMIC NEXT/SAVE BUTTON */}
                    <div className="max-w-2xl mx-auto mt-8 flex justify-end">
                        <button
                            type="button"
                            onClick={handleNext}
                            className="h-14 px-10 text-base font-semibold shadow-lg transition-all rounded-xl flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary-hover text-white hover:shadow-xl hover:-translate-y-0.5"
                        >
                            {activeStep < SUB_STEPS.length - 1 ? (
                                <>Next Step <ArrowRight className="w-5 h-5" /></>
                            ) : (
                                <>Save & Complete <CheckCircle2 className="w-5 h-5" /></>
                            )}
                        </button>
                    </div>

                    <div className="max-w-2xl mx-auto mt-8">
                        <PoweredByFooter showPrivacy={false} className="mt-4" centerLayout={true} />
                    </div>

                </div>
            </div>
        </div >
    );
}