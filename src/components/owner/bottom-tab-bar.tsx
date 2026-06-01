"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { OWNER_NAV_ITEMS } from "@/lib/owner/owner-navigation";
import { cn } from "@/lib/utils/cn";

export function OwnerBottomTabBar({ unread = 0 }: { unread?: number }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/owner" ? pathname === "/owner" : pathname.startsWith(href);

  return (
    <nav className="fixed inset-x-0 bottom-0 shrink-0 z-[91] lg:hidden" aria-label="Owner navigation">
      <div className="bg-white/80 backdrop-blur-xl border-t border-gray-200/50 shadow-[0_-2px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-stretch justify-around px-2 pb-[calc(env(safe-area-inset-bottom,0px)+4px)]">
          {OWNER_NAV_ITEMS.map((tab) => {
            const active = isActive(tab.href);
            const showBadge = tab.key === "notifications" && unread > 0;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-[68px] flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 px-2 min-w-[60px] transition-all active:scale-90",
                  active ? "text-purple-600" : "text-gray-400"
                )}
              >
                <div className={cn("relative flex items-center justify-center w-7 h-7 rounded-full transition-all", active && "bg-purple-100")}>
                  <tab.icon className={cn("h-[22px] w-[22px] transition-all", active && "text-purple-600")} />
                  {showBadge && (
                    <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-600 px-1 text-[9px] font-bold text-white">
                      {unread}
                    </span>
                  )}
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
