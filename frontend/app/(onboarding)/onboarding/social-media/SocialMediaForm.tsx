"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import Image from "next/image";
import AnimatedFormHeader from "@/components/AnimatedFormHeader";
import NextStepButton from "@/components/NextStepButton";
import { usePathname, useSearchParams } from "next/navigation";
import { useOnboardingRouting } from "@/hooks/use-onboarding-routing";
import { useI18n } from "@/lib/i18n";
import { ONBOARDING_DEMO_CONFIG, simulateTyping, delay } from "../demo-config";

interface SocialPlatform {
  id: string;
  name: string;
  icon: string;
  placeholder: string;
}

const socialPlatforms: SocialPlatform[] = [
  {
    id: "facebook",
    name: "Facebook",
    icon: "/images/social-networks/facebook.svg",
    placeholder: "https://facebook.com/yourpage",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: "/images/social-networks/instagram.svg",
    placeholder: "https://instagram.com/yourpage",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: "/images/social-networks/linkedin.svg",
    placeholder: "https://linkedin.com/company/yourcompany",
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: "/images/social-networks/youtube.svg",
    placeholder: "https://youtube.com/c/yourchannel",
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: "/images/social-networks/tiktok.svg",
    placeholder: "https://tiktok.com/@yourpage",
  },
  {
    id: "x",
    name: "X (Twitter)",
    icon: "/images/social-networks/x.svg",
    placeholder: "https://x.com/yourpage",
  },
  {
    id: "reddit",
    name: "Reddit",
    icon: "/images/social-networks/reddit.svg",
    placeholder: "https://reddit.com/user/yourpage",
  },
  {
    id: "google",
    name: "Google",
    icon: "/images/social-networks/google.svg",
    placeholder: "https://google.com/business/yourpage",
  },
];

export default function SocialMediaForm() {
  const { t } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentStepId = pathname.split("/").filter(Boolean).pop() || "";
  const { goToNextStep } = useOnboardingRouting(currentStepId);

  const [socialUrls, setSocialUrls] = useState<Record<string, string>>({});
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(
    new Set()
  );

  // Demo mode detection
  const isDemoMode = searchParams.get("demo") === "true";

  // Demo simulation
  useEffect(() => {
    if (!isDemoMode) return;

    const runDemo = async () => {
      // Wait a bit before starting
      await delay(1000);

      // Simulate adding Facebook URL
      await simulateTyping(
        (value) => setSocialUrls((prev) => ({ ...prev, facebook: value })),
        ONBOARDING_DEMO_CONFIG.demoData.socialMedia.facebook
      );
      setExpandedPlatforms((prev) => new Set([...prev, "facebook"]));

      await delay(500);

      // Simulate adding LinkedIn URL
      await simulateTyping(
        (value) => setSocialUrls((prev) => ({ ...prev, linkedin: value })),
        ONBOARDING_DEMO_CONFIG.demoData.socialMedia.linkedin
      );
      setExpandedPlatforms((prev) => new Set([...prev, "linkedin"]));

      await delay(500);

      // Simulate adding Instagram URL
      await simulateTyping(
        (value) => setSocialUrls((prev) => ({ ...prev, instagram: value })),
        ONBOARDING_DEMO_CONFIG.demoData.socialMedia.instagram
      );
      setExpandedPlatforms((prev) => new Set([...prev, "instagram"]));

      // Wait before moving to next step
      await delay(ONBOARDING_DEMO_CONFIG.delayBeforeNextStep);
    };

    runDemo();
  }, [isDemoMode]);

  const handleUrlChange = (platformId: string, url: string) => {
    setSocialUrls((prev) => ({
      ...prev,
      [platformId]: url,
    }));
  };

  const handleAddPlatform = (platformId: string) => {
    setExpandedPlatforms((prev) => new Set([...prev, platformId]));
  };

  const handleRemovePlatform = (platformId: string) => {
    setExpandedPlatforms((prev) => {
      const newSet = new Set(prev);
      newSet.delete(platformId);
      return newSet;
    });
    setSocialUrls((prev) => {
      const newUrls = { ...prev };
      delete newUrls[platformId];
      return newUrls;
    });
  };

  const validateUrl = (url: string): boolean => {
    if (!url) return true; // Empty URLs are valid (optional)
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    goToNextStep();
  };

  const hasValidUrls = Object.values(socialUrls).every((url) =>
    validateUrl(url)
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 flex-col items-center justify-center px-4 md:px-6"
    >
      <div className="w-[420px] space-y-4 md:space-y-5">
        {/* Header with Back Button and Title */}
        <AnimatedFormHeader title={t("onboarding.social_media.header")} />

        {/* Description */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-gray-600">
            {t("onboarding.social_media.description")}
          </p>
        </motion.div>

        {/* Social Media Platforms */}
        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-2">
          {socialPlatforms.map((platform, index) => (
            <motion.div
              key={platform.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              className="border border-gray-200 rounded-lg p-3 bg-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 flex items-center justify-center">
                    <Image
                      src={platform.icon}
                      alt={`${platform.name} icon`}
                      width={32}
                      height={32}
                      className="w-7 h-7"
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {platform.name}
                    </h3>
                  </div>
                </div>

                {expandedPlatforms.has(platform.id) ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemovePlatform(platform.id)}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-1" />
                    {t("onboarding.social_media.remove")}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddPlatform(platform.id)}
                    className="text-brand-primary border-brand-primary-border hover:bg-brand-primary-subtle"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {t("onboarding.social_media.add")}
                  </Button>
                )}
              </div>

              {expandedPlatforms.has(platform.id) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-3"
                >
                  <Input
                    type="url"
                    placeholder={platform.placeholder}
                    value={socialUrls[platform.id] || ""}
                    onChange={(e) =>
                      handleUrlChange(platform.id, e.target.value)
                    }
                    className={`h-9 w-full text-sm focus:border-brand-primary focus:ring-brand-primary ${socialUrls[platform.id] &&
                      !validateUrl(socialUrls[platform.id])
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300"
                      }`}
                  />
                  {socialUrls[platform.id] &&
                    !validateUrl(socialUrls[platform.id]) && (
                      <p className="mt-1 text-xs text-red-600">
                        {t("onboarding.social_media.invalid_url")}
                      </p>
                    )}
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Info Box */}
        <motion.div
          className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-1">
                {t("onboarding.social_media.info_title")}
              </h4>
              <p className="text-sm text-blue-800">
                {t("onboarding.social_media.info_description")}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Continue Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex justify-center"
        >
          <NextStepButton
            type="submit"
            className={hasValidUrls ? "" : "bg-gray-300"}
            disabled={!hasValidUrls}
          />
        </motion.div>
      </div>
    </form>
  );
}
