"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, LogOut, Loader2, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/context/auth-context";
import { ThemeProvider, useTheme } from "@/lib/context/theme-context";
import { cn } from "@/lib/utils/cn";
import { PageContainer } from "@/components/layout/page-container";
import { SwipeBack } from "@/components/admin/swipe-back";
import { buildPageTitleMap } from "@/lib/admin/panel-navigation";
import { staffPanelIconMap } from "@/lib/admin/staff-panel-icons";
import type { PanelNavItem } from "@/lib/admin/panel-navigation";
import { useStaffMessageUnreadCount } from "@/lib/hooks/use-staff-message-unread-count";
import { userHasRole } from "@/lib/auth/user-roles";
import type { AppRole } from "@/lib/auth/roles";
import { useStaffSessionGuard } from "@/lib/hooks/use-staff-session-guard";
import { StaffPanelConfigProvider } from "@/lib/hooks/use-staff-panel-config";
import { adminPanelConfig, type StaffPanelConfig } from "@/lib/admin/staff-panel-config";
import { QueryProvider } from "@/lib/providers/query-provider";
import { AdminPendingBookingsPlugin } from "@/components/staff/AdminPendingBookingsPlugin";

export interface StaffPanelShellProps {
  children: React.ReactNode;
  panelTitle: string;
  navItems: PanelNavItem[];
  requiredRole: AppRole;
  homeHref: string;
  panelConfig?: StaffPanelConfig;
  bottomTabBar?: React.ReactNode;
  /** Admin-only pending booking notification bell + dropdown */
  pendingBookingsNotifications?: boolean;
  useSessionGuard?: boolean;
  messagesHref?: string;
}

function StaffPanelShellInner({
  children,
  panelTitle,
  navItems,
  requiredRole,
  homeHref,
  panelConfig = adminPanelConfig,
  bottomTabBar,
  pendingBookingsNotifications = false,
  useSessionGuard = false,
  messagesHref,
}: StaffPanelShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [loggingOut, setLoggingOut] = useState(false);

  const resolvedMessagesHref = messagesHref ?? `${panelConfig.panelBase}/messages`;
  const onMessagesRoute = pathname.startsWith(resolvedMessagesHref);
  const hasAccess = isAuthenticated && userHasRole(user, requiredRole);
  const unreadMessages = useStaffMessageUnreadCount(hasAccess && !authLoading && !onMessagesRoute);

  useStaffSessionGuard(useSessionGuard && hasAccess && !authLoading);

  const navWithIcons = navItems.map((item) => ({
    ...item,
    icon: staffPanelIconMap[item.iconKey],
  }));

  const pageTitles = buildPageTitleMap(navItems);
  const currentTitle =
    pageTitles[pathname] ||
    Object.entries(pageTitles).find(([path]) => pathname.startsWith(path))?.[1] ||
    panelTitle;

  const isActive = (href: string) =>
    href === homeHref ? pathname === homeHref : pathname.startsWith(href);

  if (authLoading) {
    return (
      <PageContainer className="py-16 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-purple-600 mb-4" />
        <p className="text-gray-500">Verifying access…</p>
      </PageContainer>
    );
  }

  if (!hasAccess) {
    return (
      <PageContainer className="py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-4">You need {requiredRole} access to view this page.</p>
        <Link href="/login">
          <Button>Sign In</Button>
        </Link>
      </PageContainer>
    );
  }

  return (
    <StaffPanelConfigProvider config={panelConfig}>
      <div className={cn("flex flex-col h-dvh lg:flex-row lg:h-auto lg:min-h-screen", isDark && "admin-dark")}>
        {/* Mobile header */}
        <div className="relative z-[45] shrink-0 lg:hidden">
          <div className="nga-panel-header pwa-safe-top">
            <div className="flex items-center justify-between px-4 h-14">
              <h1 className="text-[17px] font-semibold text-gray-900 truncate tracking-tight">
                {currentTitle}
              </h1>
              <div className="flex items-center gap-1">
                {pendingBookingsNotifications ? (
                  <AdminPendingBookingsPlugin enabled={hasAccess} isDark={isDark} variant="mobile" />
                ) : null}
                <button
                  type="button"
                  disabled={loggingOut}
                  onClick={async () => {
                    setLoggingOut(true);
                    await logout();
                    router.push("/");
                  }}
                  className="p-2.5 rounded-full hover:bg-gray-100 active:bg-gray-200 active:scale-90 transition-all disabled:opacity-50"
                  aria-label="Sign out"
                >
                  {loggingOut ? (
                    <Loader2 className="h-[22px] w-[22px] text-gray-400 animate-spin" />
                  ) : (
                    <LogOut className="h-[22px] w-[22px] text-gray-500" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden lg:block w-64 shrink-0" />
        <aside
          className={cn(
            "fixed z-40 top-0 bottom-0 left-0 w-64 text-white flex-col transition-transform duration-300 ease-in-out hidden lg:flex lg:translate-x-0",
            isDark ? "bg-[#111111] border-r border-[#222222]" : "bg-gray-900"
          )}
        >
          <div className={cn("px-5 py-5 border-b shrink-0", isDark ? "border-[#222222]" : "border-gray-800")}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">{panelTitle}</h2>
                <p
                  className={cn("text-xs mt-0.5 truncate max-w-[160px]", isDark ? "text-gray-400" : "text-gray-600")}
                  title={user?.email}
                >
                  {user?.email}
                </p>
              </div>
              {pendingBookingsNotifications ? (
                <AdminPendingBookingsPlugin enabled={hasAccess} isDark={isDark} variant="sidebar" />
              ) : null}
            </div>
          </div>

          <nav className="flex-1 min-h-0 px-3 py-4 space-y-1 overflow-y-auto">
            {navWithIcons.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-purple-600 text-white shadow-sm shadow-purple-900/20"
                    : isDark
                      ? "text-gray-300 hover:bg-[#1a1a1a] hover:text-white"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                )}
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" />
                {item.label}
                {item.href === resolvedMessagesHref && unreadMessages > 0 && (
                  <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-500 px-1.5 text-[10px] font-bold text-white">
                    {unreadMessages}
                  </span>
                )}
                {isActive(item.href) && <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
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
              type="button"
              disabled={loggingOut}
              onClick={async () => {
                setLoggingOut(true);
                await logout();
                router.push("/");
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                isDark ? "text-gray-300 hover:bg-[#1a1a1a] hover:text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              {loggingOut ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <LogOut className="h-4.5 w-4.5" />}
              {loggingOut ? "Signing out…" : "Sign Out"}
            </button>
          </div>
        </aside>

        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+76px)] lg:pb-0">
          <SwipeBack>{children}</SwipeBack>
        </main>

        {bottomTabBar}
      </div>
    </StaffPanelConfigProvider>
  );
}

export function StaffPanelShell(props: StaffPanelShellProps) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <StaffPanelShellInner {...props} />
      </QueryProvider>
    </ThemeProvider>
  );
}
