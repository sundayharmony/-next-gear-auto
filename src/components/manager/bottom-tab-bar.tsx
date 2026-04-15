"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { href: "/manager", label: "Home", icon: LayoutDashboard },
  { href: "/manager/bookings", label: "Bookings", icon: Calendar },
  { href: "/manager/analytics", label: "Analytics", icon: BarChart3 },
];

export function ManagerBottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="shrink-0 z-[91] lg:hidden" role="tablist" aria-label="Manager navigation">
      <div className="bg-white/80 backdrop-blur-xl border-t border-gray-200/50 shadow-[0_-2px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom,0px)]">
          {TABS.map((tab) => {
            const active = tab.href === "/manager" ? pathname === "/manager" : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                role="tab"
                aria-selected={active}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 px-3 min-w-[64px] transition-all active:scale-90",
                  active ? "text-purple-600" : "text-gray-400"
                )}
              >
                <div className={cn("relative flex items-center justify-center w-7 h-7 rounded-full transition-all", active && "bg-purple-100")}>
                  <tab.icon className={cn("h-[22px] w-[22px] transition-all", active && "text-purple-600")} />
                </div>
                <span className={cn("text-[10px] font-semibold leading-tight transition-colors", active ? "text-purple-600" : "text-gray-400")}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
