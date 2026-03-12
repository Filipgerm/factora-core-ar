"use client";

import { useEffect, useState } from "react";
import { useChartAnimation } from "@/hooks/use-chart-animations";
import { CUSTOMERS_DATA } from "@/lib/customers-data";
import { getCreditLimitRequests, type CreditLimitRequest } from "@/lib/credit-limit-requests";
import { banks, insuranceCompanies } from "@/lib/data/buyer-partners";
import { ConnectedServicesCard } from "@/components/dashboards/buyer/ConnectedServicesCard";
import { ShareProfileButton } from "@/components/dashboards/buyer/ShareProfileCard";
import { Notifications } from "@/components/dashboards/buyer/Notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Building2,
  MapPin,
  Mail,
  Activity,
  CheckCircle2,
  UploadCloud
} from "lucide-react";

export function BuyerDashboard() {
  const vat = "EL123456789"; // Default VAT for buyer view
  const { containerRef, animateOnMount } = useChartAnimation();
  const [acceptedRequests, setAcceptedRequests] = useState<CreditLimitRequest[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<CreditLimitRequest[]>([]);

  const customer = CUSTOMERS_DATA.find((cust) => cust.vatNumber.toLowerCase() === vat.toLowerCase());

  useEffect(() => {
    animateOnMount(".bd-header", { delay: 0.05 });
    animateOnMount(".bd-card", { delay: 0.1, stagger: 0.1 });
    animateOnMount(".bd-notif", { delay: 0.25, stagger: 0.05 });
  }, [animateOnMount]);

  useEffect(() => {
    const loadRequests = () => {
      try {
        const allRequests = getCreditLimitRequests();
        const accepted = allRequests.filter(
          (req) => req.status === "approved" && req.acceptedAt && req.acceptedBy && req.vatNumber.toLowerCase() === vat.toLowerCase()
        );
        accepted.sort((a, b) => (b.acceptedAt ? new Date(b.acceptedAt).getTime() : 0) - (a.acceptedAt ? new Date(a.acceptedAt).getTime() : 0));
        setAcceptedRequests(accepted);

        const rejected = allRequests.filter(
          (req) => req.status === "rejected" && req.rejectedAt && req.rejectedBy && req.vatNumber.toLowerCase() === vat.toLowerCase()
        );
        rejected.sort((a, b) => (b.rejectedAt ? new Date(b.rejectedAt).getTime() : 0) - (a.rejectedAt ? new Date(a.rejectedAt).getTime() : 0));
        setRejectedRequests(rejected);
      } catch (error) {
        console.error("Failed to load requests:", error);
      }
    };

    loadRequests();
    window.addEventListener("creditLimitRequestAccepted", loadRequests);
    window.addEventListener("creditLimitRequestRejected", loadRequests);

    return () => {
      window.removeEventListener("creditLimitRequestAccepted", loadRequests);
      window.removeEventListener("creditLimitRequestRejected", loadRequests);
    };
  }, [vat]);

  if (!customer) return <div>Customer Not Found</div>;

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 min-h-screen" ref={containerRef}>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">

        {/* TOP HEADER */}
        <div className="mb-6 bd-header flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-3">
              {customer.businessName}
              <Badge variant="secondary" className="bg-green-100 text-green-800 uppercase text-[10px] tracking-wider">
                {customer.status === "onboarded" ? "Verified Profile" : customer.status}
              </Badge>
            </h1>
            <p className="text-gray-500 text-sm">
              LEGAL NAME: <span className="font-semibold text-gray-700">{customer.businessName}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="shadow-sm bg-white hover:bg-gray-50 text-gray-700">
              Update Profile
            </Button>
            <ShareProfileButton banks={banks} insuranceCompanies={insuranceCompanies} />
          </div>
        </div>

        {/* TABS WRAPPER */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-6 bg-transparent border-b border-gray-200 w-full justify-start rounded-none h-auto p-0 space-x-6">
            <TabsTrigger value="profile" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-primary rounded-none px-0 py-3 text-sm font-medium">
              Profile
            </TabsTrigger>
            <TabsTrigger value="jobs" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-primary rounded-none px-0 py-3 text-sm font-medium">
              Job Sheets
            </TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-primary rounded-none px-0 py-3 text-sm font-medium">
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-0 outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              <div className="lg:col-span-2 space-y-6">
                {/* Organization Details */}
                <Card className="bd-card border-gray-200 shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-gray-400" />
                      Organization
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Company / VAT Number</p>
                        {/* Replaced customer.name with customer.businessName */}
                        <p className="text-sm font-semibold text-gray-900">{customer.businessName} | {customer.vatNumber}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">State of Incorporation</p>
                        <p className="text-sm font-semibold text-gray-900">{customer.country || "Greece"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Organization Type</p>
                        <p className="text-sm font-semibold text-gray-900">S.A. (Société Anonyme)</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Onboarded Date</p>
                        <p className="text-sm font-semibold text-gray-900">{new Date(customer.dateShared).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Accounts Payable / Contact */}
                <Card className="bd-card border-gray-200 shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <Mail className="w-5 h-5 text-gray-400" />
                      Accounts Payable & Contact
                    </h3>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12 pb-6 border-b border-gray-100">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Primary Contact</p>
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                            John Doe
                            <span className="text-gray-400 font-normal ml-2">+30 210 123 4567</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Statement / Invoice Inbox</p>
                          <p className="text-sm font-medium text-brand-primary">ap@{customer.businessName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}.com</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Billing Address
                        </p>
                        <p className="text-sm font-medium text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-100">
                          123 Enterprise Avenue, Suite 400<br />
                          Athens, 10431, Greece
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Notifications acceptedRequests={acceptedRequests} rejectedRequests={rejectedRequests} />
              </div>

              <div className="lg:col-span-1 space-y-6">
                {/* Replaced meaningless stats with a robust KYB Compliance Panel */}
                <Card className="bd-card border-gray-200 shadow-sm bg-white">
                  <CardContent className="p-0">
                    <div className="flex flex-col divide-y divide-gray-100">

                      <div className="p-4 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                          <Building2 className="w-4 h-4" /> Customer ID
                        </span>
                        <span className="text-sm font-semibold text-gray-900">18440</span>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                          <Activity className="w-4 h-4" /> Status
                        </span>
                        <Badge className="bg-emerald-100 text-emerald-800 font-bold border-0 hover:bg-emerald-100">Active Account</Badge>
                      </div>

                      {/* KYB & COMPLIANCE VAULT WIDGET */}
                      <div className="p-5 bg-slate-50">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">KYB Compliance</p>
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded-full">100% Verified</span>
                        </div>

                        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-5">
                          <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: '100%' }}></div>
                        </div>

                        <ul className="space-y-3 mb-5">
                          <li className="flex items-center gap-2.5 text-xs font-medium text-gray-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            Certificate of Incorporation
                          </li>
                          <li className="flex items-center gap-2.5 text-xs font-medium text-gray-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            Proof of Address
                          </li>
                          <li className="flex items-center gap-2.5 text-xs font-medium text-gray-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            UBO Declaration
                          </li>
                        </ul>

                        <Button
                          variant="outline"
                          className="w-full h-9 text-xs bg-white hover:bg-gray-50 border-gray-200 text-brand-primary hover:text-brand-primary-hover shadow-sm"
                        >
                          <UploadCloud className="w-3.5 h-3.5 mr-2" />
                          Upload Document
                        </Button>
                      </div>

                    </div>
                  </CardContent>
                </Card>

                <ConnectedServicesCard connectedServices={customer.connectedServices} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="jobs" className="mt-6">
            <Card className="border-dashed border-2 border-gray-200 bg-transparent shadow-none">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Job Sheets Coming Soon</h3>
                <p className="text-gray-500 max-w-sm">Manage your active job sheets and POs here.</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="documents" className="mt-6">
            <Card className="border-dashed border-2 border-gray-200 bg-transparent shadow-none">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <Building2 className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Document Vault</h3>
                <p className="text-gray-500 max-w-sm">Upload compliance documents and financial statements here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </main>
  );
}