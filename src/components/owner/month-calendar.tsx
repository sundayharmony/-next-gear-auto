"use client";

import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface MonthCalendarDayContext {
  date: Date;
  key: string;
  inMonth: boolean;
  isToday: boolean;
}

export interface MonthCalendarProps {
  cursor: Date;
  onCursorChange: (next: Date) => void;
  weekdayLabels?: string[];
  legend?: React.ReactNode;
  loading?: boolean;
  renderDay: (ctx: MonthCalendarDayContext) => React.ReactNode;
}

export function MonthCalendar({
  cursor,
  onCursorChange,
  weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  legend,
  loading = false,
  renderDay,
}: MonthCalendarProps) {
  const monthLabel = cursor.toLocaleString("en-US", { month: "long", year: "numeric" });
  const todayKey = ymdLocal(new Date());

  const cells = useMemo(() => {
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(monthStart);
    start.setDate(1 - monthStart.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-base font-semibold text-gray-900">{monthLabel}</h2>
        <button
          type="button"
          onClick={() => onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {legend ? <div className="mb-3 flex flex-wrap gap-3 text-xs text-gray-500">{legend}</div> : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {weekdayLabels.map((w) => (
            <div key={w} className="pb-1 text-center text-[11px] font-semibold uppercase text-gray-400">
              {w}
            </div>
          ))}
          {cells.map((d, i) => {
            const key = ymdLocal(d);
            const ctx: MonthCalendarDayContext = {
              date: d,
              key,
              inMonth: d.getMonth() === cursor.getMonth(),
              isToday: key === todayKey,
            };
            return (
              <div key={i} className={cn(!ctx.inMonth && "opacity-60")}>
                {renderDay(ctx)}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
