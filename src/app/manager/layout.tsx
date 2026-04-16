"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Calendar,
  Car,
  ShieldBan,
  Wrench,
  MapPin,
  DollarSign,
  Ticket,
  Users,
  Tag,
  Star,
  ClipboardList,
  LogOut,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { SwipeBack } from "@/components/admin/swipe-back";
import { ThemeProvider } from "@/lib/context/theme-context";
import { useAuth } from "@/lib/context/auth-context";
import { ManagerBottomTabBar } from "@/components/manager/bottom-tab-bar";
import { getManagerNavItems, type PanelIconKey } from "@/lib/admin/panel-navigation";
import { Instagram } from "@/components/icons/instagram";
import { cn } from "@/lib/utils/cn";

const iconComponentMap: Record<PanelIconKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  calendarDays: CalendarDays,
  calendar: Calendar,
  car: Car,
  shieldBan: ShieldBan,
  wrench: Wrench,
  mapPin: MapPin,
  dollarSign: DollarSign,
  ticket: Ticket,
  users: Users,
  tag: Tag,
  star: Star,
  instagram: Instagram,
  clipboard: ClipboardList,
};

const NAV_ITEMS = getManagerNavItems().map((item) => ({
  href: item.href,
  label: item.label,
  icon: iconComponentMap[item.iconKey] || LayoutDashboard,
}));

function ManagerLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [loggingOut, setLoggingOut] = React.useState(false);

  if (authLoading) {
    return (
      <PageContainer className="py-16 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-purple-600 mb-4" />
        <p className="text-gray-500">Verifying access...</p>
      </PageContainer>
    );
  }

  const hasManagerAccess = isAuthenticated && (user?.role === "manager" || user?.role === "admin");
  if (!hasManagerAccess) {
    return (
      <PageContainer className="py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-4">You need manager access to view this page.</p>
        <Link href="/login"><Button>Sign In</Button></Link>
      </PageContainer>
    );
  }

  const isActive = (href: string) => href === "/manager" ? pathname === "/manager" : pathname.startsWith(href);

  return (
    <div className="flex flex-col h-dvh lg:flex-row lg:h-auto lg:min-h-screen">
      <div className="hidden lg:block w-64 shrink-0" />
      <aside className={cn("fixed z-40 top-0 bottom-0 left-0 w-64 text-white flex-col transition-transform duration-300 ease-in-out hidden lg:flex lg:translate-x-0 bg-gray-900")}>
        <div className="px-5 py-5 border-b border-gray-800 shrink-0">
          <h2 className="text-lg font-bold">Manager Panel</h2>
          <p className="text-xs mt-0.5 truncate max-w-[160px] text-gray-400" title={user?.email}>{user?.email}</p>
        </div>
        <nav className="flex-1 min-h-0 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(item.href) ? "bg-purple-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-gray-800 space-y-1 shrink-0">
          <button
            disabled={loggingOut}
            onClick={async () => { setLoggingOut(true); await logout(); router.push("/"); }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            {loggingOut ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <LogOut className="h-4.5 w-4.5" />}
            {loggingOut ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 min-h-0 overflow-y-auto">
        <SwipeBack>{children}</SwipeBack>
      </main>

      <ManagerBottomTabBar />
    </div>
  );
}

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ManagerLayoutInner>{children}</ManagerLayoutInner>
    </ThemeProvider>
  );
}
