"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CheckCircle, Shield, Key } from "lucide-react";
import Image from "next/image";
import AnimatedFormHeader from "@/components/AnimatedFormHeader";
import NextStepButton from "@/components/NextStepButton";
import { usePathname } from "next/navigation";
import { useOnboardingRouting } from "@/hooks/use-onboarding-routing";
import { useI18n } from "@/lib/i18n";

interface ERP {
  id: string;
  name: string;
  fullName: string;
  logo: string;
}

export default function ERPCredentialsForm() {
  const { t } = useI18n();
  const pathname = usePathname();
  const currentStepId = pathname.split("/").filter(Boolean).pop() || "";
  const { goToNextStep } = useOnboardingRouting(currentStepId);

  const [selectedERP, setSelectedERP] = useState<ERP | null>(null);

  const [erpAuthMethod, setErpAuthMethod] = useState<"oauth2" | "apikey">(
    "oauth2"
  );
  const [erpCredentials, setErpCredentials] = useState({
    apiKey: "",
    clientId: "",
    clientSecret: "",
  });
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isConnectionSuccess, setIsConnectionSuccess] = useState(false);

  // Load selected ERP from localStorage on mount
  useEffect(() => {
    const storedERP = localStorage.getItem("selectedERP");
    if (storedERP) {
      try {
        const erp = JSON.parse(storedERP) as ERP;
        setSelectedERP(erp);
      } catch (error) {
        console.error("Failed to parse stored ERP:", error);
        // Fallback to default if parsing fails
        setSelectedERP({
          id: "unknown",
          name: "Unknown ERP",
          fullName: "Unknown ERP System",
          logo: "/images/erps/mydata.png",
        });
      }
    } else {
      // Fallback if no ERP is found in localStorage
      setSelectedERP({
        id: "unknown",
        name: "Unknown ERP",
        fullName: "Unknown ERP System",
        logo: "/images/erps/mydata.png",
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const isFormValid =
      erpAuthMethod === "oauth2"
        ? erpCredentials.clientId.trim().length > 0 &&
        erpCredentials.clientSecret.trim().length > 0
        : erpCredentials.apiKey.trim().length > 0;

    if (!isFormValid) return;

    setIsTestingConnection(true);

    // Simulate connection test delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setIsConnectionSuccess(true);
    setIsTestingConnection(false);

    setTimeout(() => {
      goToNextStep();
    }, 1000);
  };

  const isFormValid =
    erpAuthMethod === "oauth2"
      ? erpCredentials.clientId.trim().length > 0 &&
      erpCredentials.clientSecret.trim().length > 0
      : erpCredentials.apiKey.trim().length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 flex-col items-center justify-center px-4 md:px-6"
    >
      <div className="w-[450px] space-y-4 md:space-y-5">
        {/* Header with Back Button and Title */}
        <AnimatedFormHeader title={t("onboarding.erp_credentials.header")} />

        {/* ERP Logo and Name */}
        {selectedERP && (
          <motion.div
            className="flex flex-col items-center space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="w-20 h-10 flex items-center justify-center bg-gray-100 rounded-lg">
              <Image
                src={selectedERP.logo}
                alt={`${selectedERP.name} logo`}
                width={80}
                height={40}
                className="max-w-[80px] max-h-[40px] w-auto h-auto object-contain"
                style={{ width: "auto", height: "auto" }}
              />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {t("onboarding.erp_credentials.connect_to", {
                erp: selectedERP.name,
              })}
            </h2>
            <p className="text-sm text-gray-600 text-center">
              {t("onboarding.erp_credentials.description", {
                erp: selectedERP.name,
              })}
            </p>
          </motion.div>
        )}

        {/* Authentication Method Selection */}
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Label className="text-sm font-medium text-gray-700">
            Choose Authentication Method
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {/* OAuth 2.0 Card */}
            <Card
              className={`cursor-pointer transition-all duration-200 ${erpAuthMethod === "oauth2"
                ? "border-brand-primary ring-2 ring-brand-primary-border shadow-md"
                : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                }`}
              onClick={() => setErpAuthMethod("oauth2")}
            >
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="w-8 h-8 rounded-lg bg-brand-primary-muted flex items-center justify-center">
                      <Shield className="h-4 w-4 text-brand-primary" />
                    </div>
                    {erpAuthMethod === "oauth2" && (
                      <CheckCircle className="h-4 w-4 text-brand-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                      OAuth 2.0
                      <span className="text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                        Recommended
                      </span>
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                      Secure delegated access
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* API Key Card */}
            <Card
              className={`cursor-pointer transition-all duration-200 ${erpAuthMethod === "apikey"
                ? "border-brand-primary ring-2 ring-brand-primary-border shadow-md"
                : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                }`}
              onClick={() => setErpAuthMethod("apikey")}
            >
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Key className="h-4 w-4 text-purple-600" />
                    </div>
                    {erpAuthMethod === "apikey" && (
                      <CheckCircle className="h-4 w-4 text-brand-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      API Key
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                      Simple authentication
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* OAuth 2.0 Fields */}
        {erpAuthMethod === "oauth2" && (
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="space-y-1.5">
              <Label
                htmlFor="clientId"
                className="text-sm font-medium text-gray-700"
              >
                Client ID
              </Label>
              <Input
                id="clientId"
                type="text"
                placeholder="Enter your Client ID"
                value={erpCredentials.clientId}
                onChange={(e) =>
                  setErpCredentials((prev) => ({
                    ...prev,
                    clientId: e.target.value,
                  }))
                }
                className="h-10 w-full border-gray-300 text-sm focus:border-brand-primary focus:ring-brand-primary md:h-12 md:text-base"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="clientSecret"
                className="text-sm font-medium text-gray-700"
              >
                Client Secret
              </Label>
              <Input
                id="clientSecret"
                type="password"
                placeholder="Enter your Client Secret"
                value={erpCredentials.clientSecret}
                onChange={(e) =>
                  setErpCredentials((prev) => ({
                    ...prev,
                    clientSecret: e.target.value,
                  }))
                }
                className="h-10 w-full border-gray-300 text-sm focus:border-brand-primary focus:ring-brand-primary md:h-12 md:text-base"
                required
              />
            </div>
          </motion.div>
        )}

        {/* API Key Field */}
        {erpAuthMethod === "apikey" && (
          <motion.div
            className="space-y-1.5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Label
              htmlFor="apiKey"
              className="text-sm font-medium text-gray-700"
            >
              API Key
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Enter your API key"
              value={erpCredentials.apiKey}
              onChange={(e) =>
                setErpCredentials((prev) => ({
                  ...prev,
                  apiKey: e.target.value,
                }))
              }
              className="h-10 w-full border-gray-300 text-sm focus:border-brand-primary focus:ring-brand-primary md:h-12 md:text-base"
              required
            />
          </motion.div>
        )}

        {/* Test Connection Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center"
        >
          <Button
            type="submit"
            disabled={!isFormValid || isTestingConnection}
            className={`w-full h-12 font-semibold transition-all duration-200 ${isFormValid && !isTestingConnection
              ? "bg-brand-primary hover:bg-brand-primary-hover text-white"
              : "bg-gray-300 text-gray-500"
              }`}
          >
            {isTestingConnection ? (
              <span className="flex items-center">
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin mr-2" />
                Testing Connection...
              </span>
            ) : isConnectionSuccess ? (
              <span className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Connection Successful
              </span>
            ) : (
              "Test Connection"
            )}
          </Button>
        </motion.div>
      </div>
    </form>
  );
}
