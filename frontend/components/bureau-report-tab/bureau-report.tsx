"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, History, ShieldCheck, ExternalLink, Search } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Sensitive } from "@/components/ui/sensitive";

const PROVIDERS = [
    { id: "icap", name: "ICAP CRIF", logo: "/images/bureaus/icap.png", description: "Comprehensive business information and credit risk services in Greece and SE Europe." },
    { id: "tiresias", name: "Tiresias", logo: "/images/bureaus/tiresias.png", description: "The Greek Interbank Information System for credit checking and solvency data." },
    { id: "experian", name: "Experian", logo: "/images/bureaus/experian.png", description: "Global information services company providing actionable data and analytical tools." },
];

const RETRIEVAL_HISTORY = [
    { id: "audit-1", date: "2024-02-15", bureau: "Tiresias", status: "Verified" },
    { id: "audit-2", date: "2023-02-10", bureau: "Tiresias", status: "Verified" },
];

export const BureauReportTab = () => {
    return (
        <div className="space-y-8 pb-12">
            {/* 1. GET A CREDIT REPORT SECTION */}
            <section className="space-y-6">
                <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-slate-900">Get a credit report</h2>
                    <p className="text-sm text-slate-500">Request a report from our partner network.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {PROVIDERS.map((bureau) => (
                        <Card key={bureau.id} className="flex flex-col border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex items-center justify-center min-h-[120px] p-6">
                                <div className="relative w-[85%] h-20 mx-auto transition-transform duration-500 group-hover:scale-105 origin-center">
                                    <Image
                                        src={bureau.logo}
                                        alt={bureau.name}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 33vw"
                                        className="object-contain object-center drop-shadow-sm"
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 flex flex-col h-full space-y-4">
                                <div className="space-y-2">
                                    <h3 className="font-bold text-slate-900">{bureau.name}</h3>
                                    <p className="text-xs text-slate-500 leading-relaxed">{bureau.description}</p>
                                </div>
                                <Button className="w-full bg-brand-primary text-white hover:bg-brand-primary-hover gap-2 mt-auto">
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Get Report
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* 2. RETRIEVAL HISTORY (AUDIT TRAIL) SECTION */}
            <section className="space-y-6 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <History className="w-5 h-5 text-brand-primary" />
                            Historical data access for legal verification
                        </h2>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2 text-slate-600">
                        <Download className="w-4 h-4" />
                        Export Audit Log
                    </Button>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-left font-semibold text-slate-900">Retrieval Date</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-900">Bureau Provider</th>
                                <th className="px-6 py-4 text-center font-semibold text-slate-900">Status</th>
                                <th className="px-6 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {RETRIEVAL_HISTORY.map((audit) => (
                                <tr key={audit.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-700">{audit.date}</td>
                                    <td className="px-6 py-4 font-bold text-slate-900">{audit.bureau}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-bold text-xs">
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            {audit.status}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button title="View Report" className="p-2 text-slate-400 hover:text-brand-primary transition-colors">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button title="Download" className="p-2 text-slate-400 hover:text-brand-primary transition-colors">
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};