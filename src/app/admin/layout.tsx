"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Calendar, CalendarDays, Car, Users, Tag, Star, DollarSign, Menu, X, ChevronRight, LogOut, Wrench, Instagram, Ticket, Bell, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/context/auth-context";
import { cn } from "@/lib/utils/cn";
import { PageContainer } from "@/components/layout/page-container";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { logger } from "@/lib/utils/logger";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/admin/bookings", label: "Bookings", icon: Calendar },
  { href: "/admin/vehicles", label: "Vehicles", icon: Car },
  { href: "/admin/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/admin/locations", label: "Locations", icon: MapPin },
  { href: "/admin/finances", label: "Finances", icon: DollarSign },
  { href: "/admin/tickets", label: "Tickets", icon: Ticket },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/promo-codes", label: "Promo Codes", icon: Tag },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/instagram", label: "Instagram", icon: Instagram },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [recentBookings, setRecentBookings] = useState<Array<{ id: string; customer_name: string; created_at: string; total_price: number }>>([]);

  // Track abort controller for fetch cancellation
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Handle Escape key to close notifications dropdown
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showNotifications) {
        setShowNotifications(false);
      }
    };
    window.addEventListener("keydown", handleEscapeKey);
    // Cleanup: remove listener on unmount and when showNotifications changes
    return () => {
      window.removeEventListener("keydown", handleEscapeKey);
    };
  }, [showNotifications]);

  const fetchPendingBookings = useCallback(async () => {
    // Abort previous request if it's still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this fetch
    abortControllerRef.current = new AbortController();

    try {
      const res = await adminFetch("/api/bookings?status=pending", {
        signal: abortControllerRef.current.signal,
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.data) {
        setPendingCount(data.data.length);
        // Keep 5 most recent
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
      // Ignore abort errors
      if (err instanceof Error && err.name === "AbortError") return;
      logger.error("Failed to fetch pending bookings:", err);
    }
  }, []);

  useEffect(() => {
    fetchPendingBookings();
    // Add jitter to polling interval (45-75 seconds) to prevent thundering herd
    const jitter = 45000 + Math.random() * 30000;
    const interval = setInterval(fetchPendingBookings, jitter);
    return () => {
      clearInterval(interval);
      // Abort fetch on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPendingBookings]);

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

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        aria-expanded={sidebarOpen}
        className="fixed bottom-4 right-4 z-[60] lg:hidden rounded-full bg-purple-600 p-3 text-white shadow-lg"
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-300 ease-in-out"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed z-40 top-[64px] bottom-0 left-0 w-64 bg-gray-900 text-white flex flex-col transition-transform duration-300 ease-in-out lg:relative lg:top-0 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo area */}
        <div className="px-5 py-5 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Admin Panel</h2>
              <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
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
                <Bell className={cn("h-5 w-5", pendingCount > 0 ? "text-white" : "text-gray-500")} />
                {pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 ring-2 ring-gray-900 animate-pulse">
                    {pendingCount}
                  </span>
                )}
              </button>

              {/* Notification dropdown */}
              {showNotifications && (
                <>
                  {/* Click-outside overlay */}
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
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
                        className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
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
                            className="flex items-center justify-between px-4 py-3 hover:bg-purple-50 transition-colors group"
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
                      className="block px-4 py-3 text-center text-xs font-semibold text-purple-600 hover:bg-purple-50 border-t transition-colors"
                    >
                      View all pending bookings →
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {item.label}
              {isActive(item.href) && <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-gray-800">
          <button
            disabled={loggingOut}
            onClick={async () => { setLoggingOut(true); await logout(); setSidebarOpen(false); router.push("/"); }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut className="h-4.5 w-4.5" />
            {loggingOut ? "Signing out…" : "Sign Out"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
