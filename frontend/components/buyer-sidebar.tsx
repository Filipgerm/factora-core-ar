"use client";

import {
  LogOut,
  Menu,
  X,
  Receipt,
  Users,
  User,
  Home,
  Clock,
  BarChart3,
  Blocks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ProfileDialog } from "@/components/profile-dialog";
import { CUSTOMERS_DATA } from "@/lib/customers-data";
import Image from "next/image";

const BUYER_VAT = "EL123456789";

export function BuyerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const customer = CUSTOMERS_DATA.find(
    (cust) => cust.vatNumber.toLowerCase() === BUYER_VAT.toLowerCase()
  );
  const businessName = customer?.businessName || "Business";

  useEffect(() => {
    if (isCollapsed) {
      document.body.classList.add("sidebar-collapsed");
    } else {
      document.body.classList.remove("sidebar-collapsed");
    }
    return () => document.body.classList.remove("sidebar-collapsed");
  }, [isCollapsed]);

  const menuItems = [
    { icon: Home, label: "Home", href: "/home", active: pathname === "/home" },
    { icon: Users, label: "Customers", href: "/customers", active: pathname === "/customers" || pathname.startsWith("/customers/") },
    { icon: Blocks, label: "Integrations", href: "/integrations", active: pathname === "/integrations" },
  ];

  const SidebarBody = (
    <>
      <div className="p-4 border-b border-sidebar-border shrink-0 flex flex-col gap-5 relative">

        {/* Top Row: Smooth Gliding Logo & Toggles */}
        <div className="flex items-center w-full relative h-10">
          {/* Toggles */}
          {isCollapsed ? (
            <div className="w-full flex justify-center">
              <Button variant="ghost" size="sm" className="hidden md:inline-flex text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground p-1 h-8 w-8" onClick={() => setIsCollapsed(false)}>
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            <div className="ml-auto z-10 flex gap-1">
              <Button variant="ghost" size="sm" className="hidden md:inline-flex text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground p-1 h-8 w-8" onClick={() => setIsCollapsed(true)}>
                <X className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" className="md:hidden text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground p-1 h-8 w-8" onClick={() => setIsMobileOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          )}

          {/* THE LOGO: Smoothly glides out of the sidebar bounds when collapsed */}
          <div
            className={`absolute z-50 transition-all duration-500 ease-in-out pointer-events-none flex items-center hidden md:flex
              ${isCollapsed
                /* Collapsed State: Larger logo (w-44 h-11) aligned in the dashboard */
                ? "top-0 sm:top-2 lg:top-4 left-[80px] sm:left-[84px] lg:left-[88px] w-40 h-10"
                /* Expanded State: Normal logo (w-40 h-10) centered in the sidebar */
                : "top-0 bottom-0 left-0 right-10 w-40 h-10 mx-auto"
              }`}
          >
            <Image
              src="/images/demo/factora-logo-black.png"
              alt="Factora Logo"
              fill
              className={`object-contain transition-all duration-500 ${isCollapsed ? 'object-left' : 'object-center'}`}
              priority
            />
          </div>
        </div>

        {/* Premium Company Workspace Frame */}
        {!isCollapsed && (
          <div className="relative group rounded-xl p-[1px] bg-gradient-to-br from-white/20 via-white/5 to-transparent shadow-lg overflow-hidden mt-1">
            <div className="absolute inset-0 bg-black/10" />
            {/* Subtle Factora Teal glow (to-primary/20) with backdrop blur */}
            <div className="relative rounded-xl bg-gradient-to-br from-white/10 to-primary/20 backdrop-blur-md px-4 py-3 flex items-center justify-center border border-white/10 shadow-inner">
              <span className="text-sm font-bold tracking-wide text-white drop-shadow-md truncate">
                {businessName}
              </span>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
        {menuItems.map((item) => (
          <Link key={item.label} href={item.href}>
            <Button variant={item.active ? "default" : "ghost"} className={`w-full ${isCollapsed ? "justify-center p-2 h-10" : "justify-start gap-3 h-10"} ${item.active ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`} onClick={() => { if (isCollapsed) setIsCollapsed(false); setIsMobileOpen(false); }}>
              <item.icon className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Button>
          </Link>
        ))}
      </nav>

      <div className="p-2 border-t border-sidebar-border shrink-0 overflow-hidden space-y-1">
        <ProfileDialog>
          <Button variant="ghost" className={`w-full ${isCollapsed ? "justify-center p-2 h-10" : "justify-start gap-3 h-10"} text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground`}>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 border border-blue-200 shadow-sm">
              <span className="text-[10px] font-bold text-blue-700 leading-none">JD</span>
            </div>
            {!isCollapsed && <span className="font-medium truncate">John Doe</span>}
          </Button>
        </ProfileDialog>
        <Button variant="ghost" className={`w-full ${isCollapsed ? "justify-center p-2 h-10" : "justify-start gap-3 h-10"} text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground`} onClick={() => router.push("/sign-in")}>
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && "Log out"}
        </Button>
      </div>
    </>
  );

  return (
    <>
      <Button variant="ghost" size="icon" className="md:hidden fixed left-4 top-4 z-40 h-9 w-9 text-sidebar-foreground bg-sidebar/70 backdrop-blur-sm border border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={() => setIsMobileOpen(true)}>
        <Menu className="w-5 h-5" />
      </Button>
      <div className={`hidden md:flex h-screen bg-sidebar border-r border-sidebar-border flex-col transition-all duration-300 ease-in-out relative z-30 ${isCollapsed ? "md:w-16" : "md:w-64"}`}>
        {SidebarBody}
      </div>
      {isMobileOpen && (
        <div className="md:hidden">
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setIsMobileOpen(false)} />
          <div className="fixed left-0 top-0 z-50 h-screen w-64 bg-sidebar border-r border-sidebar-border shadow-xl flex flex-col overflow-hidden">
            {SidebarBody}
          </div>
        </div>
      )}
    </>
  );
}