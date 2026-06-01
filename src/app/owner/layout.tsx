"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Loader2, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { SwipeBack } from "@/components/admin/swipe-back";
import { ThemeProvider, useTheme } from "@/lib/context/theme-context";
import { useAuth } from "@/lib/context/auth-context";
import { OwnerBottomTabBar } from "@/components/owner/bottom-tab-bar";
import { OWNER_NAV_ITEMS } from "@/lib/owner/owner-navigation";
import { useOwnerUnreadCount } from "@/lib/owner/use-owner-notifications";
import { cn } from "@/lib/utils/cn";
import { userHasRole } from "@/lib/auth/user-roles";

function OwnerLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const isOwner = isAuthenticated && userHasRole(user, "owner");
  const unread = useOwnerUnreadCount(isOwner);
  const [loggingOut, setLoggingOut] = React.useState(false);

  if (authLoading) {
    return (
      <PageContainer className="py-16 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-purple-600 mb-4" />
        <p className="text-gray-500">Verifying access...</p>
      </PageContainer>
    );
  }

  if (!isOwner) {
    return (
      <PageContainer className="py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-4">You need an owner account to view this portal.</p>
        <Link href="/login"><Button>Sign In</Button></Link>
      </PageContainer>
    );
  }

  const isActive = (href: string) =>
    href === "/owner" ? pathname === "/owner" : pathname.startsWith(href);

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
          <h2 className="text-lg font-bold">Owner Portal</h2>
          <p className={cn("text-xs mt-0.5 truncate max-w-[160px]", "text-gray-400")} title={user?.email}>{user?.email}</p>
        </div>
        <nav className="flex-1 min-h-0 px-3 py-4 space-y-1 overflow-y-auto">
          {OWNER_NAV_ITEMS.map((item) => (
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
              {item.key === "notifications" && unread > 0 && (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-500 px-1.5 text-[10px] font-bold text-white">
                  {unread}
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

      <OwnerBottomTabBar unread={unread} />
    </div>
  );
}

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <OwnerLayoutInner>{children}</OwnerLayoutInner>
    </ThemeProvider>
  );
}
