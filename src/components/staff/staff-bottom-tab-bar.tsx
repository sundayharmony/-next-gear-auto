"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, X, Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/context/theme-context";
import { cn } from "@/lib/utils/cn";

export interface StaffTabItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export interface StaffBottomTabBarProps {
  ariaLabel: string;
  homeHref: string;
  primaryTabs: StaffTabItem[];
  moreItems: StaffTabItem[];
  moreGridCols?: 2 | 3;
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
}

export function StaffBottomTabBar({
  ariaLabel,
  homeHref,
  primaryTabs,
  moreItems,
  moreGridCols = 3,
}: StaffBottomTabBarProps) {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const sheetRef = useRef<HTMLDivElement>(null);
  const moreTitleId = useId();

  const isActive = useCallback(
    (href: string) => (href === homeHref ? pathname === homeHref : pathname.startsWith(href)),
    [pathname, homeHref]
  );

  const moreIsActive = moreItems.some((item) => isActive(item.href));

  useEffect(() => {
    if (!showMore) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMore(false);
        return;
      }
      if (e.key !== "Tab" || !sheetRef.current) return;
      const focusable = getFocusable(sheetRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const timer = window.setTimeout(() => {
      const closeBtn = sheetRef.current?.querySelector<HTMLElement>("button[aria-label='Close menu']");
      closeBtn?.focus();
    }, 50);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer);
    };
  }, [showMore]);

  return (
    <>
      {showMore && (
        <div
          className="fixed inset-0 z-[89] bg-black/40 backdrop-blur-sm"
          onClick={() => setShowMore(false)}
          aria-hidden
        />
      )}

      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[90] transition-transform duration-300 ease-out",
          showMore ? "translate-y-0" : "translate-y-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={moreTitleId}
        aria-hidden={!showMore}
        ref={sheetRef}
      >
        <div className="mx-2 mb-[calc(env(safe-area-inset-bottom,0px)+76px)] rounded-2xl bg-white/95 backdrop-blur-xl shadow-2xl border border-gray-200/50 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <span id={moreTitleId} className="text-sm font-semibold text-gray-900">
              More
            </span>
            <button
              type="button"
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
              type="button"
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

          <div className={cn("grid gap-0.5 p-3", moreGridCols === 2 ? "grid-cols-2" : "grid-cols-3")}>
            {moreItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  onClick={() => setShowMore(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-[76px] flex-col items-center justify-center gap-1.5 py-3.5 px-2 rounded-xl transition-all active:scale-95",
                    active ? "bg-purple-50 text-purple-600" : "text-gray-600 hover:bg-gray-50 active:bg-gray-100"
                  )}
                >
                  <item.icon className={cn("h-6 w-6", active && "text-purple-600")} />
                  {item.badge != null && item.badge > 0 && (
                    <span className="absolute right-4 top-3 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-600 px-1 text-[9px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                  <span className={cn("text-[11px] font-medium leading-tight text-center", active && "text-purple-600")}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 shrink-0 z-[91] lg:hidden" aria-label={ariaLabel}>
        <div className="bg-white/80 backdrop-blur-xl border-t border-gray-200/50 shadow-[0_-2px_20px_rgba(0,0,0,0.06)]">
          <div className="flex items-stretch justify-around px-2 pb-[calc(env(safe-area-inset-bottom,0px)+4px)]">
            {primaryTabs.map((tab) => {
              const active = isActive(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  prefetch={false}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[68px] flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 px-3 min-w-[64px] transition-all active:scale-90",
                    active ? "text-purple-600" : "text-gray-400"
                  )}
                >
                  <div
                    className={cn(
                      "relative flex items-center justify-center w-7 h-7 rounded-full transition-all",
                      active && "bg-purple-100"
                    )}
                  >
                    <tab.icon className={cn("h-[22px] w-[22px] transition-all", active && "text-purple-600")} />
                    {tab.badge != null && tab.badge > 0 && (
                      <span className="absolute -right-1 -top-1 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-purple-600 px-0.5 text-[8px] font-bold text-white">
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-semibold leading-tight transition-colors",
                      active ? "text-purple-600" : "text-gray-400"
                    )}
                  >
                    {tab.label}
                  </span>
                </Link>
              );
            })}

            <button
              type="button"
              aria-expanded={showMore}
              aria-controls={moreTitleId}
              aria-label="More navigation"
              onClick={() => setShowMore(!showMore)}
              className={cn(
                "flex min-h-[68px] flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 px-3 min-w-[64px] transition-all active:scale-90",
                moreIsActive || showMore ? "text-purple-600" : "text-gray-400"
              )}
            >
              <div
                className={cn(
                  "relative flex items-center justify-center w-7 h-7 rounded-full transition-all",
                  (moreIsActive || showMore) && "bg-purple-100"
                )}
              >
                <MoreHorizontal
                  className={cn("h-[22px] w-[22px] transition-all", (moreIsActive || showMore) && "text-purple-600")}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold leading-tight transition-colors",
                  moreIsActive || showMore ? "text-purple-600" : "text-gray-400"
                )}
              >
                More
              </span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
