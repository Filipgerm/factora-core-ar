"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NewBankIntegrationContent, Bank } from "@/components/new-bank-integration-content";
import { NewERPIntegrationContent, ERP } from "@/components/new-erp-integration-content";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/components/user-context";
import { NewInsuranceIntegrationContent, Insurance } from "@/components/new-insurance-integration-content";
import { Building2, Landmark, ShieldCheck } from "lucide-react";


export default function IntegrationsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { userType } = useUser();

    const [activeTab, setActiveTab] = useState(userType === "supplier" ? "insurance" : "banks");

    const handleBankSelect = (bank: Bank) => {
        const demoParam = searchParams.get("demo");
        const speedParam = searchParams.get("speed");
        const queryParams = new URLSearchParams();
        if (demoParam === "true") queryParams.set("demo", "true");
        if (speedParam === "fast") queryParams.set("speed", "fast");
        queryParams.set("bank", bank.name);

        // Injected source tracking to alert the onboarding sequence to bypass upsells
        queryParams.set("source", "dashboard");
        router.push(`/onboarding/bank-consent?${queryParams.toString()}`);
    };

    const handleERPSelect = (erp: ERP) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("source", "dashboard");

        if (erp.id === "mydata") {
            router.push(`/onboarding/redirect?${params.toString()}`);
            return;
        }
        params.set("erp", erp.name);
        router.push(`/onboarding/erp-consent?${params.toString()}`);
    };

    const handleInsuranceSelect = (insurance: Insurance) => {
        // Handle insurance selection routing here. For now, we mock a success toast or direct to a consent page if it exists.
        console.log("Selected Insurance:", insurance);
        // router.push(`/onboarding/insurance-consent?source=dashboard&insurance=${insurance.id}`);
    };
    return (
        <main className="flex-1 overflow-y-auto bg-slate-50 min-h-screen">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

                {/* Simplified Header */}
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
                    <p className="text-sm text-gray-500">
                        Select a provider to sync your financial data.
                    </p>
                </div>

                <Tabs defaultValue={userType === "supplier" ? "insurance" : "banks"} value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full max-w-sm grid-cols-2 mb-6 bg-white border border-gray-200">
                        {/* Conditionally render Bank or Insurance tab based on role */}
                        {userType === "supplier" ? (
                            <TabsTrigger
                                value="insurance"
                                className="flex items-center gap-2 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:border-purple-100"
                            >
                                <ShieldCheck className="w-4 h-4" />
                                Insurance
                            </TabsTrigger>
                        ) : (
                            <TabsTrigger
                                value="banks"
                                className="flex items-center gap-2 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:border-emerald-100"
                            >
                                <Landmark className="w-4 h-4" />
                                Banks
                            </TabsTrigger>
                        )}
                        <TabsTrigger
                            value="erps"
                            className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-100"
                        >
                            <Building2 className="w-4 h-4" />
                            ERP Systems
                        </TabsTrigger>
                    </TabsList>

                    {/* Conditionally render Bank or Insurance Content */}
                    {userType === "supplier" ? (
                        <TabsContent value="insurance" className="m-0 focus-visible:ring-0">
                            <NewInsuranceIntegrationContent
                                onInsuranceSelect={handleInsuranceSelect}
                                variant="dashboard"
                            />
                        </TabsContent>
                    ) : (
                        <TabsContent value="banks" className="m-0 focus-visible:ring-0">
                            <NewBankIntegrationContent
                                onBack={() => router.push("/home")}
                                onBankSelect={handleBankSelect}
                                backButtonText=""
                                variant="dashboard"
                            />
                        </TabsContent>
                    )}

                    {/* BANKS CONTENT - Clean Grid via 'dashboard' variant */}
                    <TabsContent value="banks" className="m-0 focus-visible:ring-0">
                        <NewBankIntegrationContent
                            onBack={() => router.push("/home")}
                            onBankSelect={handleBankSelect}
                            backButtonText=""
                            variant="dashboard" // ACTIVATES COMPACT MODE
                        />
                    </TabsContent>

                    {/* ERP CONTENT - Clean Grid via 'dashboard' variant */}
                    <TabsContent value="erps" className="m-0 focus-visible:ring-0">
                        <NewERPIntegrationContent
                            onBack={() => router.push("/home")}
                            onERPSelect={handleERPSelect}
                            backButtonText=""
                            variant="dashboard" // ACTIVATES COMPACT MODE
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </main>
    );
}