/**
 * Tabs Component
 * 
 * Accessible tab navigation for switching between content sections.
 */

"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export interface TabItem {
  id: string;
  label: string;
  href?: string;
  disabled?: boolean;
  badge?: number | string;
}

export interface TabsProps {
  /** Tab items */
  tabs: TabItem[];
  /** Currently active tab ID */
  activeTab: string;
  /** Tab selection handler (for controlled tabs) */
  onTabChange?: (tabId: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Variant style */
  variant?: "underline" | "pills";
  /** Size */
  size?: "sm" | "default";
}

const variantClasses = {
  underline: {
    container: "border-b border-gray-200",
    list: "flex gap-4 -mb-px",
    tab: "border-b-2 pb-3 transition-colors",
    active: "border-purple-600 text-purple-600",
    inactive: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
  },
  pills: {
    container: "",
    list: "inline-flex gap-1 rounded-lg bg-gray-100 p-1",
    tab: "rounded-md px-3 py-1.5 font-medium transition-colors",
    active: "bg-white text-gray-900 shadow-sm",
    inactive: "text-gray-600 hover:text-gray-900",
  },
};

const sizeClasses = {
  sm: "text-xs",
  default: "text-sm",
};

/**
 * Tab navigation component.
 * 
 * @example
 * // Controlled tabs
 * <Tabs
 *   tabs={[
 *     { id: "overview", label: "Overview" },
 *     { id: "history", label: "History", badge: 5 },
 *   ]}
 *   activeTab={activeTab}
 *   onTabChange={setActiveTab}
 * />
 * 
 * @example
 * // Link-based tabs
 * <Tabs
 *   tabs={[
 *     { id: "all", label: "All", href: "/bookings" },
 *     { id: "active", label: "Active", href: "/bookings?status=active" },
 *   ]}
 *   activeTab="all"
 * />
 */
export function Tabs({
  tabs,
  activeTab,
  onTabChange,
  className,
  variant = "underline",
  size = "default",
}: TabsProps) {
  const styles = variantClasses[variant];

  return (
    <div className={cn(styles.container, className)}>
      <nav className={styles.list} role="tablist" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const tabClasses = cn(
            styles.tab,
            sizeClasses[size],
            isActive ? styles.active : styles.inactive,
            tab.disabled && "opacity-50 cursor-not-allowed"
          );

          const content = (
            <>
              {tab.label}
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    "ml-2 inline-flex items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                    isActive
                      ? "bg-purple-100 text-purple-700"
                      : "bg-gray-200 text-gray-600"
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </>
          );

          if (tab.href) {
            return (
              <Link
                key={tab.id}
                href={tab.href}
                role="tab"
                aria-selected={isActive}
                aria-disabled={tab.disabled}
                className={tabClasses}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => onTabChange?.(tab.id)}
              className={tabClasses}
            >
              {content}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default Tabs;
