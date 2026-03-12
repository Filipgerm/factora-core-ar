"use client";

import "@/styles/globals.css";
import { Suspense } from "react";
import { BusinessSidebar } from "@/components/business-sidebar";
import { BuyerSidebar } from "@/components/buyer-sidebar";
import { useUser } from "@/components/user-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userType } = useUser();

  const renderSidebar = () => {
    if (userType === "buyer") {
      return <BuyerSidebar />;
    }
    return <BusinessSidebar />;
  };

  return (
    <div className="dashboard-theme flex h-screen bg-white text-foreground">
      {renderSidebar()}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Suspense
          fallback={
            <div className="flex-1 overflow-y-auto bg-white p-6">
              Loading...
            </div>
          }
        >
          {children}
        </Suspense>
      </div>
    </div>
  );
}
