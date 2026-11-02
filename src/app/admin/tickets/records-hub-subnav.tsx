"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export const RECORDS_HUB_TABS = [
  { id: "tickets", label: "Tickets", short: "Tickets" },
  { id: "invoices", label: "Invoices", short: "Invoices" },
  { id: "incidents", label: "Incident reports", short: "Incidents" },
] as const;

export type RecordsHubTabId = (typeof RECORDS_HUB_TABS)[number]["id"];

export function useRecordsHubTabId(): RecordsHubTabId {
  const searchParams = useSearchParams();
  const raw = searchParams.get("tab");
  if (raw === "invoices" || raw === "incidents") return raw;
  return "tickets";
}

/** High-contrast hub tabs — use in page body so mobile users can reach Invoices & Incidents. */
export function RecordsHubSubnav({ panelBase }: { panelBase: string }) {
  const active = useRecordsHubTabId();
  const base = `${panelBase}/tickets`;

  return (
    <nav
      className="sticky top-0 z-20 -mx-4 px-4 py-2 mb-4 bg-white/95 border-b border-gray-200 backdrop-blur-sm sm:mx-0 sm:rounded-lg sm:border sm:px-2 lg:static lg:mb-6"
      aria-label="Billing sections"
    >
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {RECORDS_HUB_TABS.map((tab) => {
          const href = tab.id === "tickets" ? base : `${base}?tab=${tab.id}`;
          const isActive = active === tab.id;
          return (
            <Link
              key={tab.id}
              href={href}
              className={cn(
                "shrink-0 px-4 py-2.5 text-sm font-medium rounded-md transition-colors min-h-[44px] flex items-center",
                isActive
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-gray-700 bg-gray-100 hover:bg-gray-200"
              )}
            >
              <span className="sm:hidden">{tab.short}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
