import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { inter } from "@/app/ui/fonts";
import { Analytics } from "@vercel/analytics/next";
import { PrivacyProvider } from "@/components/privacy-provider";
import { UserProvider } from "@/components/user-context";
import { I18nProvider } from "@/lib/i18n";
import { SitePasswordProtection } from "../components/site-password-protection";
import { Toaster } from "@/components/ui/toaster";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.app",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <SitePasswordProtection>
          <I18nProvider>
            <UserProvider>
              <PrivacyProvider>{children}</PrivacyProvider>
            </UserProvider>
          </I18nProvider>
        </SitePasswordProtection>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
