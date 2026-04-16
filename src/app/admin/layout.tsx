"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Calendar, CalendarDays, Car, Users, Tag, Star, DollarSign, Menu, X, ChevronRight, LogOut, Wrench, Ticket, Bell, MapPin, ShieldBan, Loader2, Moon, Sun, MessageSquare
} from "lucide-react";
import { Instagram } from "@/components/icons/instagram";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/context/auth-context";
import { ThemeProvider, useTheme } from "@/lib/context/theme-context";
import { cn } from "@/lib/utils/cn";
import { PageContainer } from "@/components/layout/page-container";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { logger } from "@/lib/utils/logger";
import { BottomTabBar } from "@/components/admin/bottom-tab-bar";
import { SwipeBack } from "@/components/admin/swipe-back";
import { buildPageTitleMap, getAdminNavItems, type PanelIconKey } from "@/lib/admin/panel-navigation";
import { useStaffMessageUnreadCount } from "@/lib/hooks/use-staff-message-unread-count";

const iconComponentMap: Record<PanelIconKey, React.ComponentType<{ className?: string }>> = {
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
  clipboard: Calendar,
};

const NAV_ITEMS = getAdminNavItems().map((item) => ({
  href: item.href,
  label: item.label,
  icon: iconComponentMap[item.iconKey],
}));

// Map pathnames to short page titles for mobile header
const PAGE_TITLES: Record<string, string> = buildPageTitleMap(getAdminNavItems());

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [recentBookings, setRecentBookings] = useState<Array<{ id: string; customer_name: string; created_at: string; total_price: number }>>([]);
  const unreadMessages = useStaffMessageUnreadCount(isAuthenticated && user?.role === "admin");

  // Track abort controller for fetch cancellation
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const bellButtonRef = React.useRef<HTMLButtonElement>(null);
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Handle Escape key to close notifications dropdown
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showNotifications) {
        setShowNotifications(false);
      }
    };
    window.addEventListener("keydown", handleEscapeKey);
    return () => {
      window.removeEventListener("keydown", handleEscapeKey);
    };
  }, [showNotifications]);

  const fetchPendingBookings = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      const res = await adminFetch("/api/bookings?status=pending", {
        signal: abortControllerRef.current.signal,
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.data) {
        setPendingCount(data.data.length);
        setRecentBookings(
          data.data
            .sort((a: { created_at: string }, b: { created_at: string }) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)
            .map((b: { id: string; customer_name?: string; created_at: string; total_price?: number }) => ({
              id: b.id,
              customer_name: b.customer_name || "Unknown",
              created_at: b.created_at,
              total_price: b.total_price || 0,
            }))
        );
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      logger.error("Failed to fetch pending bookings:", err);
    }
  }, []);

  useEffect(() => {
    fetchPendingBookings();
    const jitter = 45000 + Math.random() * 30000;

    // Handle visibility change to pause/resume polling
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden - pause polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      } else {
        // Tab is visible again - resume polling
        if (!pollingIntervalRef.current) {
          fetchPendingBookings();
          pollingIntervalRef.current = setInterval(fetchPendingBookings, jitter);
        }
      }
    };

    pollingIntervalRef.current = setInterval(fetchPendingBookings, jitter);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPendingBookings]);

  if (authLoading) {
    return (
      <PageContainer className="py-16 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-purple-600 mb-4" />
        <p className="text-gray-500">Verifying access…</p>
      </PageContainer>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <PageContainer className="py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-4">You need admin privileges to view this page.</p>
        <Link href="/login"><Button>Sign In</Button></Link>
      </PageContainer>
    );
  }

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  // Get current page title for mobile header
  const currentTitle = PAGE_TITLES[pathname] || Object.entries(PAGE_TITLES).find(([path]) => pathname.startsWith(path))?.[1] || "Admin";

  return (
    <div className={cn("flex flex-col h-dvh lg:flex-row lg:h-auto lg:min-h-screen", isDark && "admin-dark")}>
      {/* ═══════ MOBILE STICKY HEADER BAR ═══════ */}
      <div className="relative z-[45] shrink-0 lg:hidden">
        <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm pwa-safe-top">
          <div className="flex items-center justify-between px-4 h-14">
            {/* Page title */}
            <h1 className="text-[17px] font-semibold text-gray-900 truncate">
              {currentTitle}
            </h1>

            {/* Right actions */}
            <div className="flex items-center gap-1">
              {/* Notification bell */}
              <button
                ref={bellButtonRef}
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label={`Notifications${pendingCount > 0 ? ` — ${pendingCount} pending` : ""}`}
                aria-expanded={showNotifications}
                className={cn(
                  "relative p-2.5 rounded-full transition-colors active:scale-90",
                  pendingCount > 0
                    ? "bg-purple-50"
                    : "hover:bg-gray-100 active:bg-gray-200"
                )}
              >
                <Bell className={cn("h-[22px] w-[22px]", pendingCount > 0 ? "text-purple-600" : "text-gray-500")} />
                {pendingCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ring-2 ring-white">
                    {pendingCount}
                  </span>
                )}
              </button>

              {/* Profile / logout */}
              <button
                disabled={loggingOut}
                onClick={async () => { setLoggingOut(true); await logout(); router.push("/"); }}
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

      {/* ═══════ NOTIFICATION DROPDOWN (shared mobile + desktop) ═══════ */}
      {showNotifications && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setShowNotifications(false)} />
          <div
            className="fixed w-80 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 z-[60] overflow-hidden"
            style={(() => {
              const rect = bellButtonRef.current?.getBoundingClientRect();
              const top = rect ? rect.bottom + 8 : 80;
              const preferredLeft = rect ? rect.right - 320 : 16;
              const left = Math.max(16, Math.min(preferredLeft, (typeof window !== "undefined" ? window.innerWidth : 400) - 336));
              return { top, left };
            })()}
          >
            <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Pending Bookings
                {pendingCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full px-1.5 py-0.5">
                    {pendingCount}
                  </span>
                )}
              </h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="p-1.5 rounded-full hover:bg-gray-200 active:bg-gray-300 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {recentBookings.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No pending bookings</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                {recentBookings.map((b) => (
                  <Link
                    key={b.id}
                    href={`/admin/bookings?booking=${b.id}`}
                    onClick={() => { setShowNotifications(false); setSidebarOpen(false); }}
                    className="flex items-center justify-between px-4 py-3 hover:bg-purple-50 active:bg-purple-100 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate group-hover:text-purple-700">{b.customer_name || "Unknown"}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {b.created_at ? new Date(b.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-purple-600 ml-3">${b.total_price.toLocaleString()}</span>
                  </Link>
                ))}
              </div>
            )}
            <Link
              href="/admin/bookings?status=pending"
              onClick={() => { setShowNotifications(false); setSidebarOpen(false); }}
              className="block px-4 py-3 text-center text-xs font-semibold text-purple-600 hover:bg-purple-50 active:bg-purple-100 border-t transition-colors"
            >
              View all pending bookings →
            </Link>
          </div>
        </>
      )}

      {/* ═══════ DESKTOP SIDEBAR (hidden on mobile) ═══════ */}
      {/* Sidebar spacer — reserves 256px for the fixed sidebar on desktop */}
      <div className="hidden lg:block w-64 shrink-0" />
      <aside
        className={cn(
          "fixed z-40 top-0 bottom-0 left-0 w-64 text-white flex-col transition-transform duration-300 ease-in-out hidden lg:flex lg:translate-x-0",
          isDark ? "bg-[#111111] border-r border-[#222222]" : "bg-gray-900"
        )}
      >
        {/* Logo area */}
        <div className={cn("px-5 py-5 border-b shrink-0", isDark ? "border-[#222222]" : "border-gray-800")}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Admin Panel</h2>
              <p className={cn("text-xs mt-0.5 truncate max-w-[160px]", isDark ? "text-gray-400" : "text-gray-600")} title={user?.email}>{user?.email}</p>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label={`Notifications${pendingCount > 0 ? ` — ${pendingCount} pending` : ""}`}
                aria-expanded={showNotifications}
                className={cn(
                  "relative p-2 rounded-lg transition-colors",
                  pendingCount > 0
                    ? "bg-purple-600/20 hover:bg-purple-600/30"
                    : "hover:bg-gray-800"
                )}
              >
                <Bell className={cn("h-5 w-5", pendingCount > 0 ? "text-white" : isDark ? "text-gray-400" : "text-gray-500")} />
                {pendingCount > 0 && (
                  <span className={cn("absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 ring-2", isDark ? "ring-[#111111]" : "ring-gray-900")}>
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 min-h-0 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
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
              {item.href === "/admin/messages" && unreadMessages > 0 && (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-500 px-1.5 text-[10px] font-bold text-white">
                  {unreadMessages}
                </span>
              )}
              {isActive(item.href) && <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className={cn("px-3 py-4 border-t space-y-1 shrink-0", isDark ? "border-[#222222]" : "border-gray-800")}>
          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isDark ? "text-gray-300 hover:bg-[#1a1a1a] hover:text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
            )}
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            {isDark ? "Light Mode" : "Dark Mode"}
            <span className={cn(
              "ml-auto relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
              isDark ? "bg-purple-600" : "bg-gray-600"
            )}>
              <span className={cn(
                "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform",
                isDark ? "translate-x-4" : "translate-x-0.5"
              )} />
            </span>
          </button>
          <button
            disabled={loggingOut}
            onClick={async () => { setLoggingOut(true); await logout(); setSidebarOpen(false); router.push("/"); }}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              isDark ? "text-gray-300 hover:bg-[#1a1a1a] hover:text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
            )}
          >
            {loggingOut ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
            ) : (
              <LogOut className="h-4.5 w-4.5" />
            )}
            {loggingOut ? "Signing out…" : "Sign Out"}
          </button>
        </div>
      </aside>

      {/* ═══════ MAIN CONTENT ═══════ */}
      <main className="flex-1 min-w-0 min-h-0 overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+76px)] lg:pb-0">
        <SwipeBack>
          {children}
        </SwipeBack>
      </main>

      {/* ═══════ BOTTOM TAB BAR (mobile only, rendered in layout for persistence) ═══════ */}
      <BottomTabBar />
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </ThemeProvider>
  );
}
