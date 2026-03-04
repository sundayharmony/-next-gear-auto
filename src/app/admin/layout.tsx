"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Calendar, CalendarDays, Car, Users, Tag, Star, DollarSign, Menu, X, ChevronRight, LogOut, Wrench, Instagram
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/context/auth-context";
import { cn } from "@/lib/utils/cn";
import { PageContainer } from "@/components/layout/page-container";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/admin/bookings", label: "Bookings", icon: Calendar },
  { href: "/admin/vehicles", label: "Vehicles", icon: Car },
  { href: "/admin/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/admin/finances", label: "Finances", icon: DollarSign },
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
        className="fixed bottom-4 right-4 z-50 lg:hidden rounded-full bg-purple-600 p-3 text-white shadow-lg"
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed z-40 top-[64px] bottom-0 left-0 w-64 bg-gray-900 text-white flex flex-col transition-transform lg:relative lg:top-0 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo area */}
        <div className="px-5 py-5 border-b border-gray-800">
          <h2 className="text-lg font-bold">Admin Panel</h2>
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
            onClick={() => { logout(); setSidebarOpen(false); router.push("/"); }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut className="h-4.5 w-4.5" />
            Sign Out
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
