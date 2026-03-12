"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash, ChevronDown } from "lucide-react";
import AnimatedFormHeader from "@/components/AnimatedFormHeader";
import NextStepButton from "@/components/NextStepButton";
import { useOnboardingRouting } from "@/hooks/use-onboarding-routing";
import { useI18n } from "@/lib/i18n";

interface Shareholder {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isExpanded: boolean;
  isSaved?: boolean;
}

export default function ShareholdersForm() {
  const { t } = useI18n();
  const pathname = usePathname();
  const currentStepId = pathname.split("/").filter(Boolean).pop() || "";
  const { goToNextStep } = useOnboardingRouting(currentStepId);
  const [shareholders, setShareholders] = useState<Shareholder[]>([
    {
      id: "1",
      firstName: "",
      lastName: "",
      email: "",
      isExpanded: false,
      isSaved: false,
    },
  ]);
  const [openShareholderId, setOpenShareholderId] = useState<string>("");

  const addShareholder = () => {
    if (shareholders.length >= 10) return;
    const newId = (shareholders.length + 1).toString();
    setShareholders([
      ...shareholders,
      {
        id: newId,
        firstName: "",
        lastName: "",
        email: "",
        isExpanded: false,
        isSaved: false,
      },
    ]);
    setOpenShareholderId(newId);
  };

  const removeShareholder = (id: string) => {
    if (shareholders.length > 1) {
      setShareholders(shareholders.filter((s) => s.id !== id));
      if (openShareholderId === id) {
        const remainingShareholders = shareholders.filter((s) => s.id !== id);
        setOpenShareholderId(remainingShareholders[0]?.id || "");
      }
    }
  };

  const updateShareholder = (
    id: string,
    field: keyof Shareholder,
    value: string | boolean
  ) => {
    setShareholders(
      shareholders.map((s) =>
        s.id === id ? { ...s, [field]: value, isSaved: false } : s
      )
    );
  };

  const toggleShareholder = (id: string) => {
    setOpenShareholderId(openShareholderId === id ? "" : id);
  };

  const isFormValid =
    shareholders.length > 0 &&
    shareholders.every(
      (s) => s.firstName && s.lastName && s.email && s.isSaved
    );

  const handleSaveShareholder = (id: string) => {
    setShareholders(
      shareholders.map((s) =>
        s.id === id
          ? {
            ...s,
            isSaved: !!(s.firstName && s.lastName && s.email),
          }
          : s
      )
    );
    setOpenShareholderId("");
  };

  const handleCancelShareholder = (id: string) => {
    setOpenShareholderId("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    goToNextStep();
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <form
        className="flex flex-1 flex-col items-center justify-center px-4 md:px-6"
        onSubmit={handleSubmit}
      >
        <div className="w-[500px] space-y-5 md:space-y-6">
          <AnimatedFormHeader
            title={t("onboarding.steps.shareholders.title")}
          />

          <motion.div
            key="info-box"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="rounded-lg border border-brand-primary-border bg-brand-primary-subtle p-3.5 md:p-4"
          >
            <h3 className="mb-2 text-[13px] md:text-sm font-semibold text-gray-900">
              {t("onboarding.shareholders.info_title")}
            </h3>
            <div className="space-y-1.5 text-xs md:text-[13px] text-brand-primary leading-relaxed">
              <p>{t("onboarding.shareholders.info_p1")}</p>
              <p>{t("onboarding.shareholders.info_p2")}</p>
              <p>{t("onboarding.shareholders.info_p3")}</p>
            </div>
          </motion.div>

          <div
            className={`space-y-2.5 ${shareholders.length > 1 || openShareholderId
              ? "max-h-80 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:hover:bg-gray-400 [&::-webkit-scrollbar-track]:bg-gray-100"
              : ""
              }`}
          >
            {shareholders.map((shareholder, index) => (
              <motion.div
                key={shareholder.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1, duration: 0.4 }}
                className={`overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm ${shareholder.isSaved ? "border-brand-primary-border" : ""
                  }`}
              >
                <div className="flex w-full items-center justify-between px-3 py-2 md:px-4 md:py-2.5">
                  <motion.button
                    type="button"
                    onClick={() => toggleShareholder(shareholder.id)}
                    className="-m-2 flex flex-1 items-center gap-3 rounded-lg p-2 text-left hover:bg-gray-50"
                    whileHover={{ backgroundColor: "#f9fafb" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary-muted text-xs font-semibold text-brand-primary md:h-8 md:w-8 md:text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-[13px] font-semibold text-gray-900 md:text-sm">
                        {t("onboarding.business.title_shareholder", {
                          index: index + 1,
                        })}
                      </h3>
                      <p className="text-[11px] text-gray-500 md:text-xs">
                        {shareholder.firstName && shareholder.lastName
                          ? `${shareholder.firstName} ${shareholder.lastName}`
                          : t("onboarding.shareholders.click_to_add_details")}
                        {shareholder.isSaved && (
                          <span className="ml-2 font-semibold text-green-600">
                            ({t("onboarding.shareholders.saved")})
                          </span>
                        )}
                      </p>
                    </div>
                    <motion.div
                      animate={{
                        rotate: openShareholderId === shareholder.id ? 180 : 0,
                      }}
                      transition={{ duration: 0.2 }}
                      className="ml-auto"
                    >
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </motion.div>
                  </motion.button>

                  {shareholders.length > 1 && (
                    <motion.button
                      type="button"
                      onClick={() => removeShareholder(shareholder.id)}
                      className="ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Trash className="h-3 w-3" />
                    </motion.button>
                  )}
                </div>

                <AnimatePresence>
                  {openShareholderId === shareholder.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-gray-100 bg-gray-50 p-3.5">
                        <div className="space-y-2.5">
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1, duration: 0.3 }}
                          >
                            <Input
                              type="text"
                              placeholder={t(
                                "onboarding.shareholders.first_name"
                              )}
                              value={shareholder.firstName}
                              onChange={(e) =>
                                updateShareholder(
                                  shareholder.id,
                                  "firstName",
                                  e.target.value
                                )
                              }
                              className="h-9 md:h-10 border-gray-300 bg-white text-sm focus:border-brand-primary focus:ring-brand-primary"
                              required
                            />
                          </motion.div>
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.3 }}
                          >
                            <Input
                              type="text"
                              placeholder={t(
                                "onboarding.shareholders.last_name"
                              )}
                              value={shareholder.lastName}
                              onChange={(e) =>
                                updateShareholder(
                                  shareholder.id,
                                  "lastName",
                                  e.target.value
                                )
                              }
                              className="h-9 md:h-10 border-gray-300 bg-white text-sm focus:border-brand-primary focus:ring-brand-primary"
                              required
                            />
                          </motion.div>
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.3 }}
                          >
                            <Input
                              type="email"
                              placeholder={t("onboarding.shareholders.email")}
                              value={shareholder.email}
                              onChange={(e) =>
                                updateShareholder(
                                  shareholder.id,
                                  "email",
                                  e.target.value
                                )
                              }
                              className="h-9 md:h-10 border-gray-300 bg-white text-sm focus:border-brand-primary focus:ring-brand-primary"
                              required
                            />
                          </motion.div>
                        </div>

                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4, duration: 0.3 }}
                          className="mt-3 flex gap-3"
                        >
                          <Button
                            variant="outline"
                            className="h-9 md:h-10 flex-1 border-brand-primary-border bg-white text-brand-primary hover:bg-brand-primary-subtle text-xs md:text-sm"
                            type="button"
                            onClick={() =>
                              handleCancelShareholder(shareholder.id)
                            }
                          >
                            {t("onboarding.shareholders.cancel")}
                          </Button>
                          <Button
                            className="h-9 md:h-10 flex-1 bg-brand-primary text-white hover:bg-brand-primary-hover text-xs md:text-sm"
                            type="button"
                            onClick={() =>
                              handleSaveShareholder(shareholder.id)
                            }
                            disabled={
                              !shareholder.firstName ||
                              !shareholder.lastName ||
                              !shareholder.email
                            }
                          >
                            {t("onboarding.shareholders.save")}
                          </Button>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="flex items-center justify-between"
          >
            <div className="flex flex-col gap-0.5">
              <h3 className="text-[13px] md:text-sm font-semibold text-gray-900">
                {t("onboarding.business.add_shareholder")}
              </h3>
              {shareholders.length >= 10 && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] text-gray-500"
                >
                  {t("onboarding.business.max_reached")}
                </motion.p>
              )}
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={addShareholder}
                disabled={shareholders.length >= 10}
                className={`flex items-center gap-1.5 h-8 text-xs ${shareholders.length >= 10
                  ? "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-400"
                  : "border-brand-primary-border bg-white text-brand-primary hover:bg-brand-primary-subtle"
                  }`}
              >
                <Plus className="h-3 w-3" />
                {t("common.add")}
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="flex justify-center"
          >
            <NextStepButton
              className={`h-10 md:h-11 text-white text-sm w-full ${isFormValid
                ? "bg-brand-primary hover:bg-brand-primary-hover"
                : "cursor-not-allowed bg-gray-300"
                }`}
              type="submit"
            >
              Next
            </NextStepButton>
          </motion.div>
        </div>
      </form>
    </div>
  );
}