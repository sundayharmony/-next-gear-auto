"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

export function RecordsHubHeroStats({
  stats,
}: {
  stats: { value: ReactNode; label: string; valueClassName?: string }[];
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white/10 rounded-lg p-3">
          <p className={cn("text-2xl font-bold", stat.valueClassName)}>{stat.value}</p>
          <p className="text-xs page-hero-subtitle">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

export function RecordsHubChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 text-xs rounded-md transition-colors capitalize",
        active ? "bg-white text-gray-900 font-medium shadow-sm" : "text-gray-500 hover:text-gray-700",
      )}
    >
      {children}
    </button>
  );
}

export function RecordsHubChipGroup({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1">{children}</div>;
}

/** Same tappable row used on Tickets, Invoices, and Incident reports. */
export function RecordsHubRecordRow({
  onClick,
  icon,
  iconClassName,
  title,
  badges,
  meta,
  trailing,
}: {
  onClick: () => void;
  icon: ReactNode;
  iconClassName: string;
  title: ReactNode;
  badges?: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md hover:border-purple-200 transition-all focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 outline-none"
      onClick={onClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", iconClassName)}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900">{title}</span>
              {badges}
            </div>
            {meta ? <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">{meta}</div> : null}
          </div>
          {trailing ? <div className="text-right shrink-0">{trailing}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}
