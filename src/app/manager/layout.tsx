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
  MessageSquare,
  ClipboardList,
  LogOut,
  Loader2,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { SwipeBack } from "@/components/admin/swipe-back";
import { ThemeProvider, useTheme } from "@/lib/context/theme-context";
import { useAuth } from "@/lib/context/auth-context";
import { ManagerBottomTabBar } from "@/components/manager/bottom-tab-bar";
import { getManagerNavItems, type PanelIconKey } from "@/lib/admin/panel-navigation";
import { Instagram } from "@/components/icons/instagram";
import { cn } from "@/lib/utils/cn";
import { useStaffMessageUnreadCount } from "@/lib/hooks/use-staff-message-unread-count";

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
  messageSquare: MessageSquare,
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
  const { isDark, toggleTheme } = useTheme();
  const unreadMessages = useStaffMessageUnreadCount(isAuthenticated && hasRoleForMessages(user?.role));
  const [loggingOut, setLoggingOut] = React.useState(false);

  function hasRoleForMessages(role: string | undefined) {
    return role === "manager" || role === "admin";
  }

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
    <div className={cn("flex flex-col h-dvh lg:flex-row lg:h-auto lg:min-h-screen", isDark && "admin-dark")}>
      <div className="hidden lg:block w-64 shrink-0" />
      <aside
        className={cn(
          "fixed z-40 top-0 bottom-0 left-0 w-64 text-white flex-col transition-transform duration-300 ease-in-out hidden lg:flex lg:translate-x-0",
          isDark ? "bg-[#111111] border-r border-[#222222]" : "bg-gray-900"
        )}
      >
        <div className={cn("px-5 py-5 border-b shrink-0", isDark ? "border-[#222222]" : "border-gray-800")}>
          <h2 className="text-lg font-bold">Manager Panel</h2>
          <p className={cn("text-xs mt-0.5 truncate max-w-[160px]", isDark ? "text-gray-400" : "text-gray-400")} title={user?.email}>{user?.email}</p>
        </div>
        <nav className="flex-1 min-h-0 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-purple-600 text-white"
                  : isDark
                    ? "text-gray-300 hover:bg-[#1a1a1a] hover:text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {item.label}
              {item.href === "/manager/messages" && unreadMessages > 0 && (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-500 px-1.5 text-[10px] font-bold text-white">
                  {unreadMessages}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className={cn("px-3 py-4 border-t space-y-1 shrink-0", isDark ? "border-[#222222]" : "border-gray-800")}>
          <button
            type="button"
            onClick={toggleTheme}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isDark ? "text-gray-300 hover:bg-[#1a1a1a] hover:text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
            )}
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            {isDark ? "Light Mode" : "Dark Mode"}
            <span
              className={cn(
                "ml-auto relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                isDark ? "bg-purple-600" : "bg-gray-600"
              )}
            >
              <span
                className={cn(
                  "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform",
                  isDark ? "translate-x-4" : "translate-x-0.5"
                )}
              />
            </span>
          </button>
          <button
            disabled={loggingOut}
            onClick={async () => { setLoggingOut(true); await logout(); router.push("/"); }}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              isDark ? "text-gray-300 hover:bg-[#1a1a1a] hover:text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
            )}
          >
            {loggingOut ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <LogOut className="h-4.5 w-4.5" />}
            {loggingOut ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 min-h-0 overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+76px)] lg:pb-0">
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
