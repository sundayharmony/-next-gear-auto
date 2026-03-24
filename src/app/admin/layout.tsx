"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Calendar, CalendarDays, Car, Users, Tag, Star, DollarSign, Menu, X, ChevronRight, LogOut, Wrench, Instagram, Ticket, Bell
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

  // Handle Escape key to close notifications dropdown
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showNotifications) {
        setShowNotifications(false);
      }
    };
    window.addEventListener("keydown", handleEscapeKey);
    return () => window.removeEventListener("keydown", handleEscapeKey);
  }, [showNotifications]);

  const fetchPendingBookings = useCallback(async () => {
    try {
      const res = await adminFetch("/api/bookings?status=pending");
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
      logger.error("Failed to fetch pending bookings:", err);
    }
  }, []);

  useEffect(() => {
    fetchPendingBookings();
    const interval = setInterval(fetchPendingBookings, 60000); // Poll every 60s
    return () => clearInterval(interval);
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
        className="fixed bottom-4 right-4 z-50 lg:hidden rounded-full bg-purple-600 p-3 text-white shadow-lg"
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
            <h2 className="text-lg font-bold">Admin Panel</h2>
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Toggle notifications dropdown"
                aria-expanded={showNotifications}
                title="Unread notifications"
                className="relative p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Bell className="h-5 w-5 text-gray-400" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {pendingCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border z-50">
                  <div className="p-3 border-b">
                    <h3 className="text-sm font-semibold text-gray-900">Pending Bookings</h3>
                  </div>
                  {recentBookings.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">No pending bookings</div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto">
                      {recentBookings.map((b) => (
                        <Link
                          key={b.id}
                          href={`/admin/bookings?highlight=${b.id}`}
                          onClick={() => { setShowNotifications(false); setSidebarOpen(false); }}
                          className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 border-b last:border-0"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">{b.customer_name}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(b.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-purple-600">${b.total_price}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                  <Link
                    href="/admin/bookings?status=pending"
                    onClick={() => { setShowNotifications(false); setSidebarOpen(false); }}
                    className="block p-2.5 text-center text-xs font-medium text-purple-600 hover:bg-purple-50 border-t"
                  >
                    View all pending bookings
                  </Link>
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
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
