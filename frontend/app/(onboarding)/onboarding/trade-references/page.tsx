"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import {
    Plus, Trash2, Building2, User, Mail, Phone, CheckCircle2, ArrowLeft
} from "lucide-react";
import NextStepButton from "@/components/NextStepButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import Image from "next/image";
import { PoweredByFooter } from "@/components/PoweredByFooter";
import { useOnboardingRouting } from "@/hooks/use-onboarding-routing";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { DynamicBrandLogo } from "@/components/DynamicBrandLogo";


interface TradeReference {
    id: string;
    companyName: string;
    contactPerson: string;
    email: string;
    phoneNumber: string;
}

export default function TradeReferencesForm() {
    const pathname = usePathname();
    const currentStepId = pathname.split("/").filter(Boolean).pop() || "";
    const { goToNextStep, goToPreviousStep } = useOnboardingRouting(currentStepId);
    const { t } = useI18n();

    const [references, setReferences] = useState<TradeReference[]>([
        { id: "1", companyName: "", contactPerson: "", email: "", phoneNumber: "" },
        { id: "2", companyName: "", contactPerson: "", email: "", phoneNumber: "" },
        { id: "3", companyName: "", contactPerson: "", email: "", phoneNumber: "" },
    ]);

    const addReference = () => {
        if (references.length >= 6) return;
        const newId = Math.random().toString(36).substr(2, 9);
        setReferences([
            ...references,
            { id: newId, companyName: "", contactPerson: "", email: "", phoneNumber: "" },
        ]);
    };

    const removeReference = (id: string) => {
        if (references.length > 3) {
            setReferences(references.filter((r) => r.id !== id));
        }
    };

    const updateReference = (id: string, field: keyof TradeReference, value: string) => {
        setReferences(
            references.map((r) => (r.id === id ? { ...r, [field]: value } : r))
        );
    };

    const isReferenceComplete = (r: TradeReference) =>
        r.companyName.trim().length > 1 &&
        r.contactPerson.trim().length > 1 &&
        r.email.includes("@") &&
        r.phoneNumber.trim().length > 5;

    const validReferencesCount = references.filter(isReferenceComplete).length;
    const isFormValid = validReferencesCount >= 1;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;
        goToNextStep();
    };

    const handleBack = () => {
        goToPreviousStep();
    };

    return (
        <form onSubmit={handleSubmit} className="fixed inset-0 flex flex-col bg-slate-50 z-40">
            {/* HEADER SECTION */}
            <div className="flex-shrink-0 bg-brand-surface pt-4 pb-6 px-6 shadow-md z-50 relative">
                {/* Top Row: Back Button (Left), Logo (Center), Language Switcher (Right) */}
                <div className="flex justify-between items-center mb-4">

                    {/* Left: Back Button */}
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
                                {t("onboarding.trade_references.back")}
                            </span>
                        </button>
                    </div>

                    {/* Center: Dynamic Logo */}
                    <DynamicBrandLogo className="relative w-40 h-16 md:w-48 flex-shrink-0" />

                    {/* Right: Language Switcher */}
                    <div className="flex-1 flex justify-end text-white">
                        <LanguageSwitcher />
                    </div>
                </div>

                {/* Title & Description */}
                <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                        {t("onboarding.trade_references.header")}
                    </h1>
                    <p className="text-slate-300 text-sm mt-2 max-w-xl mx-auto">
                        {t("onboarding.trade_references.description")}
                    </p>
                </div>
                <div className="max-w-3xl mx-auto mt-8 hidden sm:block">
                    <OnboardingStepper variant="horizontal" theme="dark" />
                </div>
            </div>

            {/* SCROLLABLE AREA */}
            <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0 scroll-smooth">
                <div className="max-w-7xl mx-auto pb-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence initial={false}>
                            {references.map((ref, index) => {
                                const isComplete = isReferenceComplete(ref);
                                const canDelete = index >= 3;

                                return (
                                    <motion.div
                                        key={ref.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        className={`group relative overflow-hidden rounded-xl border bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg flex flex-col justify-between ${isComplete ? "border-brand-primary-border bg-brand-primary-subtle/30" : "border-slate-200"
                                            }`}
                                    >
                                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors duration-300 ${isComplete ? "bg-brand-primary" : "bg-slate-200 group-hover:bg-brand-primary"
                                            }`} />

                                        <div className="flex items-center justify-between mb-4 pl-3">
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-600 border border-slate-200">
                                                    {index + 1}
                                                </span>
                                                {t("onboarding.trade_references.supplier_label")}
                                                {isComplete && <CheckCircle2 className="h-4 w-4 text-brand-primary" />}
                                            </h3>

                                            {canDelete && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeReference(ref.id)}
                                                    className="text-slate-300 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-4 pl-3">
                                            <div className="relative group/input">
                                                <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-300 group-focus-within/input:text-brand-primary transition-colors" />
                                                <Input
                                                    placeholder={t("onboarding.trade_references.company_name")}
                                                    value={ref.companyName}
                                                    onChange={(e) => updateReference(ref.id, "companyName", e.target.value)}
                                                    className="pl-9 h-10 text-sm bg-slate-50/50 border-slate-200 focus:bg-white focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                                                />
                                            </div>

                                            <div className="relative group/input">
                                                <User className="absolute left-3 top-3 h-4 w-4 text-slate-300 group-focus-within/input:text-brand-primary transition-colors" />
                                                <Input
                                                    placeholder={t("onboarding.trade_references.contact_person")}
                                                    value={ref.contactPerson}
                                                    onChange={(e) => updateReference(ref.id, "contactPerson", e.target.value)}
                                                    className="pl-9 h-10 text-sm bg-slate-50/50 border-slate-200 focus:bg-white focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                                                />
                                            </div>

                                            <div className="relative group/input">
                                                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-300 group-focus-within/input:text-brand-primary transition-colors" />
                                                <Input
                                                    type="email"
                                                    placeholder={t("onboarding.trade_references.email")}
                                                    value={ref.email}
                                                    onChange={(e) => updateReference(ref.id, "email", e.target.value)}
                                                    className={`pl-9 h-10 text-sm bg-slate-50/50 border-slate-200 focus:bg-white focus:border-brand-primary focus:ring-1 focus:ring-brand-primary ${ref.email.length > 0 && !ref.email.includes("@") ? "border-red-300 focus:border-red-500" : ""
                                                        }`}
                                                />
                                            </div>

                                            <div className="relative group/input">
                                                <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-300 group-focus-within/input:text-brand-primary transition-colors" />
                                                <Input
                                                    type="tel"
                                                    placeholder={t("onboarding.trade_references.phone")}
                                                    value={ref.phoneNumber}
                                                    onChange={(e) => updateReference(ref.id, "phoneNumber", e.target.value)}
                                                    className="pl-9 h-10 text-sm bg-slate-50/50 border-slate-200 focus:bg-white focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {/* Add Button */}
                    {references.length < 6 && (
                        <motion.button
                            type="button"
                            onClick={addReference}
                            whileHover={{ scale: 1.005 }}
                            whileTap={{ scale: 0.99 }}
                            className="w-full mt-6 h-12 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-medium hover:border-brand-primary hover:text-brand-primary hover:bg-brand-primary-subtle/30 transition-all flex items-center justify-center gap-2 bg-white"
                        >
                            <Plus className="h-5 w-5" />
                            <span>{t("onboarding.trade_references.add_supplier")}</span>
                        </motion.button>
                    )}

                    {/* Next Button and Powered By Footer Wrapper */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col items-center mt-12 space-y-6"
                    >
                        <button
                            type="submit"
                            disabled={!isFormValid}
                            className={`h-12 px-8 text-base font-semibold shadow-md transition-all rounded-lg ${isFormValid
                                ? "bg-brand-primary hover:bg-brand-primary-hover text-white hover:shadow-xl"
                                : "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                                }`}
                        >
                            {isFormValid
                                ? t("onboarding.trade_references.continue")
                                : t("onboarding.trade_references.provide_more", { count: 1 - validReferencesCount })}
                        </button>

                        {/* Powered By Factora Footer */}
                        <PoweredByFooter showPrivacy={false} className="mt-2" centerLayout={true} />
                    </motion.div>
                </div>
            </div>
        </form>
    );
}