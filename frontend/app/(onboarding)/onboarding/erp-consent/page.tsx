"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShieldCheck,
  ChevronRight,
  CheckCircle2,
  CheckCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";

function ERPConsentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const erpNameParam = searchParams.get("erp");
  const erpName = erpNameParam || "Your ERP";
  const demoParam = searchParams.get("demo");
  const speedParam = searchParams.get("speed");

  const [authMethod, setAuthMethod] = useState<"oauth2" | "apikey">("oauth2");
  const [apiKey, setApiKey] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleTestConnection = () => {
    if (isTesting || isSuccess) return;
    const hasOAuthCreds = clientId && clientSecret;
    const hasAnyCreds = Boolean(apiKey) || Boolean(hasOAuthCreds);
    if (!hasAnyCreds) return;

    setIsTesting(true);
    setTimeout(() => {
      setIsSuccess(true);
      setTimeout(() => {
        const queryParams = new URLSearchParams(searchParams.toString());
        const queryString = queryParams.toString();
        const redirectUrl = `/onboarding/erp-success${queryString ? `?${queryString}` : ""
          }`;
        router.push(redirectUrl);
      }, 800);
    }, 1000);
  };

  return (
    <div className="flex w-full h-full items-center justify-center bg-gradient-to-br from-brand-page-bg-start to-brand-page-bg-end px-4 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-5xl rounded-xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-5 bg-brand-surface text-white">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5" />
            <h1 className="text-xl font-semibold">
              {t("onboarding.erp_consent.title", { erp: erpName })}
            </h1>
          </div>
          <p className="text-white/80 mt-1">
            {t("onboarding.erp_consent.subtitle")}
          </p>
        </div>

        <div className="px-6 py-8 space-y-8">
          {/* Authentication Method Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              {t("onboarding.integration_consent.auth_method_label")}
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {/* OAuth 2.0 Card */}
              <Card
                className={`cursor-pointer transition-all duration-200 ${authMethod === "oauth2"
                  ? "border-primary ring-2 ring-primary/20 shadow-md"
                  : "border-border hover:border-primary/30 hover:shadow-sm"
                  }`}
                onClick={() => setAuthMethod("oauth2")}
              >
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold flex items-center gap-1.5">
                          {t("onboarding.integration_consent.auth_methods.oauth2.title")}
                          <span className="text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                            {t("onboarding.integration_consent.auth_methods.oauth2.badge")}
                          </span>
                        </h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                          {t("onboarding.integration_consent.auth_methods.oauth2.description")}
                        </p>
                      </div>
                      {authMethod === "oauth2" && (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* API Key Card */}
              <Card
                className={`cursor-pointer transition-all duration-200 ${authMethod === "apikey"
                  ? "border-primary ring-2 ring-primary/20 shadow-md"
                  : "border-border hover:border-primary/30 hover:shadow-sm"
                  }`}
                onClick={() => setAuthMethod("apikey")}
              >
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold flex items-center gap-1.5">
                          {t("onboarding.integration_consent.auth_methods.apikey.title")}
                        </h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                          {t("onboarding.integration_consent.auth_methods.apikey.description")}
                        </p>
                      </div>
                      {authMethod === "apikey" && (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* OAuth 2.0 Fields */}
          {authMethod === "oauth2" && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientId" className="text-sm font-medium">
                    {t(
                      "onboarding.integration_consent.inputs.client_id.label"
                    )}
                  </Label>
                  <Input
                    id="clientId"
                    type="text"
                    placeholder={t(
                      "onboarding.integration_consent.inputs.client_id.placeholder"
                    )}
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientSecret" className="text-sm font-medium">
                    {t(
                      "onboarding.integration_consent.inputs.client_secret.label"
                    )}
                  </Label>
                  <Input
                    id="clientSecret"
                    type="password"
                    placeholder={t(
                      "onboarding.integration_consent.inputs.client_secret.placeholder"
                    )}
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    className="h-12"
                  />
                </div>
              </div>
            </div>
          )}

          {/* API Key Field */}
          {authMethod === "apikey" && (
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-sm font-medium">
                {t("onboarding.integration_consent.inputs.api_key.label")}
              </Label>
              <Input
                id="apiKey"
                type="password"
                placeholder={t(
                  "onboarding.integration_consent.inputs.api_key.placeholder"
                )}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="h-12"
              />
            </div>
          )}

          {/* Connect Button */}
          <div className="pt-4">
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-60 h-12"
              onClick={handleTestConnection}
              disabled={isTesting}
            >
              {isTesting ? (
                <span className="inline-flex items-center">
                  <span className="mr-2 h-4 w-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                  {t("onboarding.integration_consent.button.testing")}
                </span>
              ) : isSuccess ? (
                <span className="inline-flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {t("onboarding.integration_consent.button.success")}
                </span>
              ) : (
                t("onboarding.integration_consent.button.idle")
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ERPConsentLoading() {
  return (
    <div className="flex w-full h-full items-center justify-center bg-gradient-to-br from-brand-page-bg-start to-brand-page-bg-end px-4 py-8">
      <div className="w-full max-w-5xl rounded-xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden">
        <div className="px-6 py-5 bg-brand-surface text-white">
          <div className="animate-pulse">
            <div className="h-5 w-48 bg-white/20 rounded mb-1"></div>
            <div className="h-4 w-64 bg-white/20 rounded"></div>
          </div>
        </div>
        <div className="px-6 py-8 space-y-8">
          <div className="animate-pulse">
            <div className="h-6 w-48 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
            <div className="h-10 w-full bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ERPConsentPage() {
  return (
    <Suspense fallback={<ERPConsentLoading />}>
      <ERPConsentContent />
    </Suspense>
  );
}
