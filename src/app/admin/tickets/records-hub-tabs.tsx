"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import {
  RECORDS_HUB_TABS,
  useRecordsHubTabId,
  type RecordsHubTabId,
} from "./records-hub-subnav";

const TABS = RECORDS_HUB_TABS;

export type RecordsHubTab = RecordsHubTabId;

export function useRecordsHubTab(): RecordsHubTab {
  return useRecordsHubTabId();
}

export function RecordsHubTabs({
  panelBase,
  className,
}: {
  panelBase: string;
  className?: string;
}) {
  const active = useRecordsHubTab();
  const base = `${panelBase}/tickets`;

  return (
    <div className={cn("flex flex-wrap gap-1 p-1 bg-white/10 rounded-lg", className)}>
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.id === "tickets" ? base : `${base}?tab=${tab.id}`}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
            active === tab.id
              ? "bg-white text-purple-900 shadow-sm"
              : "text-purple-100 hover:text-white hover:bg-white/10"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
