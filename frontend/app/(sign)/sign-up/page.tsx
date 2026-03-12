"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import { useState, Suspense } from "react";
import { PoweredByFooter } from "@/components/PoweredByFooter";


export const dynamic = "force-dynamic";

function SignUpForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useI18n();

    // State
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function handleSignUp() {
        // Basic Validation
        if (!email || !password || !confirmPassword) {
            setError(t("errors.password_required") || "All fields are required");
            return;
        }

        if (password !== confirmPassword) {
            setError(t("errors.passwords_do_not_match") || "Passwords do not match");
            return;
        }

        setError("");
        setIsLoading(true);

        try {
            // SIMULATION: Create user logic here
            // await signUp({ email, password }); 

            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 800));

            // Redirect to the first step of onboarding (preserve query params)
            const query = searchParams.toString();
            router.push(`/onboarding/email-verification${query ? `?${query}` : ""}`);
        } catch (err) {
            setError("Failed to create account. Please try again.");
            setIsLoading(false);
        }
    }

    return (
        <motion.div
            className="relative flex flex-col items-center justify-center p-8 md:p-16 h-full"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
        >
            {/* Language Selection */}
            <motion.div
                className="absolute top-4 left-1/2 -translate-x-1/2"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            >
                <div className="flex items-center justify-center gap-2">
                    <LanguageSwitcher />
                </div>
            </motion.div>

            <motion.div
                className="w-full max-w-lg rounded-xl border bg-white p-8 shadow-sm md:p-10"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
            >
                <h2 className="mb-6 text-center text-sm font-semibold text-gray-700 uppercase">
                    {t("signup.shared.signup_title") || "Create your account"}
                </h2>

                <motion.div
                    className="space-y-6"
                    initial="hidden"
                    animate="show"
                    variants={{
                        hidden: {},
                        show: {
                            transition: { staggerChildren: 0.08, delayChildren: 0.25 },
                        },
                    }}
                >
                    {/* Email Input */}
                    <motion.div
                        className="space-y-2"
                        variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                    >
                        <label className="text-xs font-medium text-gray-700">
                            {t("labels.email") || "Email"}
                        </label>
                        <Input
                            placeholder={t("placeholders.email") || "Enter your email"}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            type="email"
                        />
                    </motion.div>

                    {/* Password Input */}
                    <motion.div
                        className="space-y-2"
                        variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                    >
                        <label className="text-xs font-medium text-gray-700">
                            {t("labels.password")}
                        </label>
                        <Input
                            type="password"
                            placeholder={t("placeholders.password")}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </motion.div>

                    {/* Confirm Password Input */}
                    <motion.div
                        className="space-y-2"
                        variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                    >
                        <label className="text-xs font-medium text-gray-700">
                            {t("labels.confirm_password")}
                        </label>
                        <Input
                            type="password"
                            placeholder={t("placeholders.confirm_password")}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        {error ? (
                            <p className="text-xs text-red-600 mt-2" role="alert">
                                {error}
                            </p>
                        ) : null}
                    </motion.div>

                    {/* Submit Button */}
                    <motion.div
                        variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                    >
                        <Button
                            className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white transition-colors"
                            onClick={handleSignUp}
                            disabled={isLoading}
                        >
                            {isLoading ? t("common.loading") : t("common.continue") || "Create Account"}
                        </Button>
                    </motion.div>

                    {/* Login Link */}
                    <motion.div
                        className="pt-4 text-center text-sm text-gray-600"
                        variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                    >
                        <span>Already have an account? </span>
                        <button
                            type="button"
                            className="font-medium text-brand-primary underline underline-offset-2 hover:text-brand-primary/90"
                            onClick={() => router.push("/sign-in")}
                        >
                            Sign in
                        </button>
                    </motion.div>
                </motion.div>
            </motion.div>
            <div className="mt-8 z-10">
                <PoweredByFooter showPrivacy={false} centerLayout={true} />
            </div>
        </motion.div>
    );
}

// Loading fallback
function SignUpLoading() {
    return (
        <div className="relative flex items-center justify-center p-8 md:p-16">
            <div className="w-full max-w-lg rounded-xl border bg-white p-8 shadow-sm md:p-10 animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-8 w-1/3 mx-auto"></div>
                <div className="space-y-6">
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                </div>
            </div>
        </div>
    );
}

export default function SignUpPage() {
    return (
        <Suspense fallback={<SignUpLoading />}>
            <SignUpForm />
        </Suspense>
    );
}