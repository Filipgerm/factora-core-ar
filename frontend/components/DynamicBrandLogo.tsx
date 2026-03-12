"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

interface DynamicBrandLogoProps {
    // Allows you to pass specific dimensions/margins from the parent page
    className?: string;
}

export function DynamicBrandLogo({ className = "relative w-40 h-16 md:w-48" }: DynamicBrandLogoProps) {
    const pathname = usePathname();

    const resolveLogoPath = (path: string) => {
        // Centralized dictionary of routes requiring the white logo
        const darkBackgroundRoutes = [
            "/onboarding/trade-references",
            "/onboarding/bank-selection",
            "/onboarding/erp-selection",
            "/onboarding/platform-selection",
            "/onboarding/job-sheet",
        ];

        const requiresWhiteLogo = darkBackgroundRoutes.some((route) =>
            path.includes(route)
        );

        return requiresWhiteLogo
            ? "/images/demo/kleemann-logo-white.png"
            : "/images/demo/kleemann-logo-black.png";
    };

    return (
        <div className={className}>
            <Image
                src={resolveLogoPath(pathname)}
                alt="Brand Logo"
                fill
                className="object-contain object-center"
                priority
            />
        </div>
    );
}