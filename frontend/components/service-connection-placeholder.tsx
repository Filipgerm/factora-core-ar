"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Link,
  BarChart3,
  Clock,
  TrendingUp,
  Users,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface ServiceConnectionPlaceholderProps {
  missingServices: ReadonlyArray<"erp" | "bank">;
}

const serviceConfig = {
  bank: {
    icon: Link,
    name: "Bank Connection",
    description:
      "This customer hasn't connected their bank account yet. Transaction data will be available once they connect.",
    color: "blue",
    benefits: [
      "Real-time transaction monitoring",
      "Cash flow analysis",
      "Account balance tracking",
    ],
  },
  erp: {
    icon: BarChart3,
    name: "ERP System",
    description:
      "This customer hasn't connected their ERP system yet. Financial reports will be available once they connect.",
    color: "purple",
    benefits: [
      "Profit & Loss statements",
      "Customer and supplier data",
      "Financial forecasting",
    ],
  },
};

export function ServiceConnectionPlaceholder({
  missingServices,
}: ServiceConnectionPlaceholderProps) {
  const getServiceIcon = (service: "erp" | "bank") => {
    const Icon = serviceConfig[service].icon;
    return <Icon className="w-8 h-8" />;
  };

  const getServiceColor = (service: "erp" | "bank") => {
    return serviceConfig[service].color;
  };

  if (missingServices.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {missingServices.map((service) => {
        const config = serviceConfig[service];
        const Icon = config.icon;

        return (
          <Card
            key={service}
            className="border-dashed border-2 border-gray-200"
          >
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div
                  className={`p-4 rounded-full ${
                    service === "bank" ? "bg-blue-50" : "bg-purple-50"
                  }`}
                >
                  <Icon
                    className={`w-8 h-8 ${
                      service === "bank" ? "text-blue-600" : "text-purple-600"
                    }`}
                  />
                </div>
              </div>
              <CardTitle className="text-xl text-gray-900">
                {config.name} Not Connected
              </CardTitle>
              <p className="text-gray-600 mt-2">{config.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Benefits */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">
                  What will be available:
                </h4>
                <ul className="space-y-1">
                  {config.benefits.map((benefit, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-2 text-sm text-gray-600"
                    >
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Info Message */}
              <div className="pt-4 border-t border-gray-100">
                <div className="text-center text-sm text-gray-500">
                  Data will appear here once the customer connects their{" "}
                  {config.name.toLowerCase()}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Additional Info */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900 mb-1">
                Customer Connection Status
              </h4>
              <p className="text-sm text-gray-700">
                This customer hasn't connected all required services yet. You'll
                see their data here once they complete the integration process.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
