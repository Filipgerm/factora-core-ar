"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { ONBOARDING_STEPS } from "@/lib/onboarding";
import { Suspense, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MODULE_LABELS: Record<string, string> = {
    core: "Identity",
    company_info: "Business",
    signatory: "Shareholders",
    references: "References",
    job_sheet: "Job Details",
    bank_connection: "Bank",
    terms: "Terms",
    accounting: "Accounting",
    platform_connection: "Platform",
    social_media: "Social",
};

interface StepperProps {
    align?: "center" | "right" | "left";
    variant?: "default" | "compact" | "horizontal" | "vertical";
    theme?: "light" | "dark";
}

function StepperInner({ align = "center", variant = "default", theme = "light" }: StepperProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isOpen, setIsOpen] = useState(false);

    const excludeParam = searchParams.get("exclude");
    const excludedModules = excludeParam ? excludeParam.split(",") : [];

    const currentStep = ONBOARDING_STEPS.find((s) => pathname.endsWith(s.id));
    let currentModule = currentStep?.module || "core";
    if (currentStep?.id === "terms") {
        currentModule = "terms";
    }
    const activeModules: string[] = [];
    ONBOARDING_STEPS.forEach((step) => {
        // Silently filter out accounting from the visual timeline, keeping it as a dormant backlog item.
        if (step.module === "accounting") return;

        // If the step is terms, register it under the pseudo-module "terms" 
        // to ensure it anchors concomitantly at the end of the timeline.
        let visualModule = step.module;
        if (step.id === "terms") {
            visualModule = "terms";
        }

        if (!excludedModules.includes(step.module) && !activeModules.includes(visualModule)) {
            activeModules.push(visualModule);
        }
    });

    const currentModuleIndex = activeModules.indexOf(currentModule);
    const totalModules = activeModules.length;
    const alignmentClass = align === "center" ? "left-1/2 -translate-x-1/2" : align === "right" ? "right-0" : "left-0";

    // 1. VERTICAL VARIANT (Used on 65/35 split screens)
    if (variant === "vertical") {
        const isDark = theme === "dark";

        return (
            <div className="flex flex-col relative py-4">
                {/* Background Track (Vertical) */}
                <div className={`absolute left-[11px] md:left-[13px] top-6 bottom-6 w-0.5 z-0 ${isDark ? "bg-white/10" : "bg-gray-200"}`} />

                {/* Active Progress Track (Vertical) */}
                <div
                    className="absolute left-[11px] md:left-[13px] top-6 w-0.5 bg-brand-primary z-0 transition-all duration-700 ease-out"
                    style={{ height: totalModules > 1 ? `${(currentModuleIndex / (totalModules - 1)) * 100}%` : '0%' }}
                />

                <div className="flex flex-col gap-6 relative z-10">
                    {activeModules.map((mod, idx) => {
                        const isCompleted = idx < currentModuleIndex;
                        const isCurrent = idx === currentModuleIndex;
                        const isUpcoming = idx > currentModuleIndex;

                        return (
                            <div key={mod} className="flex items-center gap-4 group">
                                <div className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold transition-all duration-300 shrink-0
                  ${isCompleted ? 'bg-brand-primary text-white shadow-[0_0_10px_rgba(var(--brand-primary),0.3)]' : ''}
                  ${isCurrent && isDark ? 'bg-white text-slate-900 ring-4 ring-white/20' : ''}
                  ${isCurrent && !isDark ? 'bg-slate-900 text-white ring-4 ring-slate-900/20' : ''}
                  ${isUpcoming && isDark ? 'bg-slate-800 text-slate-500 border border-slate-600' : ''}
                  ${isUpcoming && !isDark ? 'bg-white text-gray-300 border border-gray-200' : ''}
                `}>
                                    {isCompleted ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    ) : (
                                        idx + 1
                                    )}
                                </div>

                                <span className={`text-xs md:text-sm transition-all duration-300
                  ${isCurrent && isDark ? 'text-white font-bold' : ''}
                  ${isCurrent && !isDark ? 'text-slate-900 font-bold' : ''}
                  ${!isCurrent && isDark ? 'text-slate-400 font-medium' : ''}
                  ${!isCurrent && !isDark ? 'text-slate-400 font-medium' : ''}
                `}>
                                    {MODULE_LABELS[mod] || mod}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // 2. HORIZONTAL VARIANT (Used on full-width unconstrained single-sided pages)
    if (variant === "horizontal") {
        const isDark = theme === "dark";
        const horizontalProgressPercent = totalModules > 1 ? (currentModuleIndex / (totalModules - 1)) * 100 : 0;

        return (
            <div className="w-full max-w-4xl mx-auto py-2">
                <div className="relative flex items-center justify-between min-w-[280px]">
                    {/* Background Track */}
                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 rounded-full z-0 ${isDark ? "bg-white/10" : "bg-gray-200"}`} />

                    {/* Active Progress Track */}
                    <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-brand-primary rounded-full z-0 transition-all duration-700 ease-out"
                        style={{ width: `${horizontalProgressPercent}%` }}
                    />

                    {/* Nodes */}
                    {activeModules.map((mod, idx) => {
                        const isCompleted = idx < currentModuleIndex;
                        const isCurrent = idx === currentModuleIndex;
                        const isUpcoming = idx > currentModuleIndex;

                        return (
                            <div key={mod} className="relative z-10 flex flex-col items-center">
                                <div className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[9px] md:text-[10px] font-bold transition-all duration-300 shrink-0
                  ${isCompleted ? 'bg-brand-primary text-white shadow-[0_0_10px_rgba(var(--brand-primary),0.3)]' : ''}
                  ${isCurrent && isDark ? 'bg-white text-slate-900 ring-4 ring-white/20' : ''}
                  ${isCurrent && !isDark ? 'bg-slate-900 text-white ring-4 ring-slate-900/20' : ''}
                  ${isUpcoming && isDark ? 'bg-slate-800 text-slate-500 border border-slate-600' : ''}
                  ${isUpcoming && !isDark ? 'bg-white text-gray-300 border border-gray-200' : ''}
                `}>
                                    {isCompleted ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    ) : (
                                        idx + 1
                                    )}
                                </div>

                                <div className="absolute top-8 w-16 md:w-20 text-center pointer-events-none flex justify-center">
                                    <span className={`text-[9px] md:text-[10px] leading-tight whitespace-normal transition-all duration-300
                    ${isCurrent && isDark ? 'text-white font-bold scale-105' : ''}
                    ${isCurrent && !isDark ? 'text-slate-900 font-bold scale-105' : ''}
                    ${!isCurrent && isDark ? 'text-slate-400 font-medium' : ''}
                    ${!isCurrent && !isDark ? 'text-slate-400 font-medium' : ''}
                  `}>
                                        {MODULE_LABELS[mod] || mod}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="h-10 w-full" />
            </div>
        );
    }

    // 3. RADIAL / COMPACT DROPDOWN VARIANT (Fallback/Default legacy behavior)
    const radialProgressPercent = totalModules > 0 ? ((currentModuleIndex + 1) / totalModules) * 100 : 0;

    return (
        <div className="relative z-50 flex items-center" onMouseLeave={() => setIsOpen(false)}>
            <button
                onMouseEnter={() => setIsOpen(true)}
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-3 rounded-full transition-all duration-300 border border-transparent hover:border-gray-200 hover:bg-gray-50/80 ${variant === "default" ? "px-3 py-2" : "p-0"
                    }`}
            >
                <div className="relative w-9 h-9 flex items-center justify-center shrink-0 bg-white shadow-sm rounded-full border border-gray-100">
                    <svg className="w-8 h-8 transform -rotate-90 absolute" viewBox="0 0 36 36">
                        <path className="text-gray-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-gray-900 transition-all duration-700 ease-out" strokeWidth="3" strokeDasharray={`${radialProgressPercent}, 100`} stroke="currentColor" fill="none" strokeLinecap="round" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <span className="text-[11px] font-bold text-gray-800">{currentModuleIndex + 1}</span>
                </div>

                {variant === "default" && (
                    <div className="hidden sm:flex flex-col items-start text-left">
                        <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Step {currentModuleIndex + 1} of {totalModules}</span>
                        <span className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                            {MODULE_LABELS[currentModule] || currentModule}
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </span>
                    </div>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className={`absolute top-full mt-3 w-64 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-gray-100 p-5 ${alignmentClass}`}
                    >
                        <div className="absolute -top-4 left-0 w-full h-4 bg-transparent cursor-default" />
                        <div className="flex flex-col gap-5 relative">
                            <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-gray-100 z-0" />
                            {activeModules.map((mod, idx) => {
                                const isCompleted = idx < currentModuleIndex;
                                const isCurrent = idx === currentModuleIndex;
                                const isUpcoming = idx > currentModuleIndex;

                                return (
                                    <div key={mod} className="flex items-start gap-3.5 relative z-10 bg-white">
                                        <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold transition-all shrink-0
                        ${isCompleted ? "bg-green-500 text-white shadow-sm" : ""}
                        ${isCurrent ? "bg-gray-900 text-white ring-4 ring-gray-900/10" : ""}
                        ${isUpcoming ? "bg-white text-gray-400 border-2 border-gray-100" : ""}
                      `}
                                        >
                                            {isCompleted ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                            ) : (
                                                idx + 1
                                            )}
                                        </div>
                                        <div className="flex flex-col pt-0.5">
                                            <span className={`text-sm font-semibold transition-colors ${isCurrent ? "text-gray-900" : "text-gray-500"}`}>{MODULE_LABELS[mod] || mod}</span>
                                            {isCurrent && <span className="text-[11px] font-medium text-gray-400 mt-0.5">In Progress</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function OnboardingStepper(props: StepperProps) {
    return (
        <Suspense fallback={<div className="w-9 h-9 bg-gray-50 rounded-full animate-pulse" />}>
            <StepperInner {...props} />
        </Suspense>
    );
}