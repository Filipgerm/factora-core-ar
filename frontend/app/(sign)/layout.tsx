"use client";
import "@/styles/globals.css";
import { ReactNode } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import Image from "next/image";
import { usePathname } from "next/navigation";

export const dynamic = "force-dynamic";

export default function SignInLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();

  // Evaluate if we are in the Factora (Sign-In) or Kleemann (Sign-Up) context
  const isSignIn = pathname.includes("sign-in");

  return (
    // Conditionally inject 'dashboard-theme' so Factora Teal cascades down to the form buttons
    <div className="relative grid h-dvh w-dvw grid-cols-1 md:grid-cols-2 overflow-hidden">

      {/* Background pattern overlay at 5% opacity */}
      <div className="pointer-events-none absolute inset-0 bg-[url('/images/application-status/pattern.png')] bg-repeat opacity-5" />

      {/* Left panel: Marketing context */}
      <div className="relative hidden overflow-hidden md:block md:rounded-tr-3xl md:rounded-br-3xl shadow-lg">
        {/* Unified the background to use the corporate Blue gradient exclusively for a consistent enterprise impression */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-grad-start to-brand-grad-end" />
        {/* Content Container */}
        <div className="relative flex h-full flex-col justify-between p-10 text-white">

          {/* Main Content Vertical Center */}
          <div className="relative flex h-full flex-col items-center justify-center p-10 text-white">
            <div className={!isSignIn ? "flex flex-col items-center text-center w-full" : ""}>
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className={`text-5xl font-semibold tracking-tight ${!isSignIn ? "flex flex-col items-center" : ""}`}
              >
                {/* Logo is completely removed on Sign-In. Only displays Kleemann on Sign-Up. */}
                <div className="relative w-[400px] h-[180px] mb-4">
                  <Image
                    src="/images/demo/kleemann-logo-white.png"
                    alt="Kleemann Logo"
                    fill
                    className="object-contain object-center"
                    priority
                  />
                </div>


              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel: route-specific content */}
      {/* Wrapped children in a relative container to absolutely position the footer without affecting the form size */}
      <div className="relative flex h-full w-full flex-col">
        {children}
      </div>
    </div >
  );
}

function Feature({ icon, text }: { icon: string; text: string }) {
  return (
    <motion.div
      className="flex items-center gap-3 text-sm"
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, ease: "easeOut" },
        },
      }}
    >
      <span className="text-lg" aria-hidden>
        {icon}
      </span>
      <span>{text}</span>
    </motion.div>
  );
}