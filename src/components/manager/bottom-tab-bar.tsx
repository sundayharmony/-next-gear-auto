"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  MoreHorizontal,
  X,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { getManagerNavItems, type PanelIconKey } from "@/lib/admin/panel-navigation";
import { Instagram } from "@/components/icons/instagram";
import { cn } from "@/lib/utils/cn";
import { useTheme } from "@/lib/context/theme-context";

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

interface TabItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const managerNavItems = getManagerNavItems();
const PRIMARY_TAB_KEYS = new Set(["dashboard", "bookings", "calendar", "messages"]);
const PRIMARY_TABS: TabItem[] = managerNavItems
  .filter((item) => PRIMARY_TAB_KEYS.has(item.key))
  .map((item) => ({
    href: item.href,
    label: item.key === "dashboard" ? "Home" : item.label,
    icon: iconComponentMap[item.iconKey] || LayoutDashboard,
  }));

const MORE_ITEMS: TabItem[] = managerNavItems
  .filter((item) => !PRIMARY_TAB_KEYS.has(item.key))
  .map((item) => ({
  href: item.href,
  label: item.key === "dashboard" ? "Home" : item.label,
  icon: iconComponentMap[item.iconKey] || LayoutDashboard,
}));

export function ManagerBottomTabBar() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const isActive = (href: string) => (href === "/manager" ? pathname === "/manager" : pathname.startsWith(href));
  const moreIsActive = MORE_ITEMS.some((item) => isActive(item.href));

  return (
    <>
      {showMore && (
        <div className="fixed inset-0 z-[89] bg-black/40 backdrop-blur-sm" onClick={() => setShowMore(false)} />
      )}

      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[90] transition-transform duration-300 ease-out",
          showMore ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="mx-2 mb-[calc(env(safe-area-inset-bottom,0px)+78px)] rounded-2xl bg-white/95 backdrop-blur-xl shadow-2xl border border-gray-200/50 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">More</span>
            <button
              onClick={() => setShowMore(false)}
              className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isDark ? <Moon className="h-4 w-4 text-purple-400" /> : <Sun className="h-4 w-4 text-yellow-500" />}
              <span className="text-sm font-medium">{isDark ? "Dark Mode" : "Light Mode"}</span>
            </div>
            <button
              onClick={toggleTheme}
              className={cn(
                "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
                isDark ? "bg-purple-600" : "bg-gray-300"
              )}
              aria-label="Toggle dark mode"
            >
              <span
                className={cn(
                  "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                  isDark ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-0.5 p-3">
            {MORE_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMore(false)}
                  className={cn(
                    "flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl py-3.5 px-2 transition-all active:scale-95",
                    active ? "bg-purple-50 text-purple-600" : "text-gray-600 hover:bg-gray-50 active:bg-gray-100"
                  )}
                >
                  <item.icon className={cn("h-6 w-6", active && "text-purple-600")} />
                  <span className={cn("text-[11px] font-medium leading-tight text-center", active && "text-purple-600")}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 shrink-0 z-[91] lg:hidden" role="tablist" aria-label="Manager navigation">
        <div className="bg-white/80 backdrop-blur-xl border-t border-gray-200/50 shadow-[0_-2px_20px_rgba(0,0,0,0.06)]">
          <div className="flex items-stretch justify-around px-2 pb-[calc(env(safe-area-inset-bottom,0px)+4px)]">
            {PRIMARY_TABS.map((tab) => {
              const active = isActive(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  role="tab"
                  aria-selected={active}
                  className={cn(
                    "flex min-h-[68px] flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 px-3 min-w-[64px] transition-all active:scale-90",
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

            <button
              role="tab"
              aria-selected={moreIsActive}
              onClick={() => setShowMore(!showMore)}
              className={cn(
                "flex min-h-[68px] flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 px-3 min-w-[64px] transition-all active:scale-90",
                moreIsActive || showMore ? "text-purple-600" : "text-gray-400"
              )}
            >
              <div className={cn("relative flex items-center justify-center w-7 h-7 rounded-full transition-all", (moreIsActive || showMore) && "bg-purple-100")}>
                <MoreHorizontal className={cn("h-[22px] w-[22px] transition-all", (moreIsActive || showMore) && "text-purple-600")} />
              </div>
              <span className={cn("text-[10px] font-semibold leading-tight transition-colors", (moreIsActive || showMore) ? "text-purple-600" : "text-gray-400")}>
                More
              </span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
