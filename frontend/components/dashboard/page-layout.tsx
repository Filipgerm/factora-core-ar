"use client";

import { ReactNode } from "react";
import Image from "next/image";

interface PageLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
  headerActions?: ReactNode;
  maxWidth?: "4xl" | "7xl";
  background?: "white" | "slate-50";
}

export function PageLayout({
  title,
  description,
  children,
  headerActions,
  maxWidth = "7xl",
  background = "white",
}: PageLayoutProps) {
  const backgroundClass = "bg-white"; // TODO: Make this dynamic
  const maxWidthClass = maxWidth === "4xl" ? "max-w-4xl" : "max-w-7xl";

  return (
    <main className={`flex-1 overflow-y-auto ${backgroundClass} min-h-screen text-sm`}>
      <div className={`${maxWidthClass} mx-auto p-4 sm:p-6 lg:p-6`}>
        {/* Header */}
        <div
          className={`flex flex-col ${headerActions ? "sm:flex-row sm:items-center" : ""
            } justify-between mb-6 gap-4`}
        >

          <div className="flex flex-col">

            {/* Natively embedded Logo. Inherits perfect alignment. 
                Only visible on desktop when body has .sidebar-collapsed */}
            <div className="hidden [.sidebar-collapsed_&]:md:block relative w-36 h-9 mb-4 transition-all duration-300">
              <Image
                src="/images/demo/factora-logo-black.png"
                alt="Factora Logo"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
              {title}
            </h1>
            {description && <p className="text-gray-600">{description}</p>}
          </div>
          {headerActions && <div>{headerActions}</div>}
        </div>

        {children}
      </div>
    </main>
  );
}
