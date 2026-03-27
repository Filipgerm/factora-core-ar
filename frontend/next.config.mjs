/** @type {import('next').NextConfig} */
import path from "path";
import { fileURLToPath } from "url";

import bundleAnalyzer from "@next/bundle-analyzer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig = {
  // Turbopack must resolve `next` from the package root; auto-detection can
  // wrongly pick `frontend/app` when the App Router layout confuses inference.
  turbopack: {
    root: __dirname,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default withBundleAnalyzer(nextConfig);
