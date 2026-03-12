"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useI18n } from "@/lib/i18n";

interface PoweredByFooterProps {
    showPrivacy?: boolean;
    className?: string;
    centerLayout?: boolean;
}

export function PoweredByFooter({
    showPrivacy = true,
    className = "pb-4 md:pb-8",
    centerLayout = false,
}: PoweredByFooterProps) {
    const { t } = useI18n();

    return (
        <motion.div
            className={`flex flex-col items-center shrink-0 gap-4 ${className}`}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            {showPrivacy && (
                <motion.a
                    href="/privacy-policy.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative text-xs text-brand-primary hover:text-brand-primary-hover md:text-sm"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <span className="relative">
                        {t("common.privacy_link")}
                        <motion.span
                            className="absolute -bottom-1 left-0 h-0.5 bg-brand-primary"
                            initial={{ width: 0 }}
                            whileHover={{ width: "100%" }}
                            transition={{ duration: 0.2 }}
                        />
                    </span>
                </motion.a>
            )}

            <div className={`flex items-center gap-2 text-[11px] text-slate-400 font-medium ${centerLayout ? "justify-center" : ""}`}>
                <span>{t("login.business.powered_by", { defaultValue: "Powered by" })}</span>
                <div className="relative w-24 h-8 opacity-90 transition-all duration-300">
                    <Image
                        src="/images/demo/factora-logo-black.png"
                        alt="Factora Logo"
                        fill
                        className={`object-contain ${centerLayout ? "object-center" : "object-left"}`}
                    />
                </div>
            </div>
        </motion.div>
    );
}