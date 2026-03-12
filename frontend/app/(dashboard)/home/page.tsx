"use client";

import { useUser } from "@/components/user-context";
import { FinancialInstitutionDashboard } from "@/components/dashboards/financial-institution-dashboard";
import { SupplierDashboard } from "@/components/dashboards/supplier-dashboard";
import { BuyerDashboard } from "@/components/dashboards/buyer-dashboard";

export default function HomePage() {
  const { userType } = useUser();

  if (userType === "buyer") {
    return <BuyerDashboard />;
  }

  if (userType === "supplier") {
    return <SupplierDashboard />;
  }

  return <FinancialInstitutionDashboard />;
}

