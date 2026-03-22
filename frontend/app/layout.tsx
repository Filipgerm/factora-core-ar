import type { Metadata } from "next";
import { inter } from "@/app/ui/fonts";
import { AppProviders } from "@/app/providers";
import { Analytics } from "@vercel/analytics/next";
import { PrivacyProvider } from "@/components/privacy-provider";
import { Toaster } from "@/components/ui/toaster";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Factora",
  description: "AI-native ERP and financial platform",
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
        <AppProviders>
          <PrivacyProvider>{children}</PrivacyProvider>
        </AppProviders>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
