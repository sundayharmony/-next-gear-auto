"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";
import { getLocalYmd } from "@/lib/utils/date-helpers";

export interface AgendaDateStripDay {
  date: string;
  label: string;
  dayNum: number;
  isToday: boolean;
  /** Optional booking/event count indicator dot */
  count?: number;
}

interface AgendaDateStripProps {
  days: AgendaDateStripDay[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  className?: string;
}

export function buildAgendaDateStrip(centerDate: string, rangeDays = 7): AgendaDateStripDay[] {
  const center = new Date(centerDate + "T12:00:00");
  const today = getLocalYmd();
  const days: AgendaDateStripDay[] = [];
  const start = new Date(center);
  start.setDate(start.getDate() - Math.floor(rangeDays / 2));

  for (let i = 0; i < rangeDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const date = getLocalYmd(d);
    days.push({
      date,
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      dayNum: d.getDate(),
      isToday: date === today,
    });
  }
  return days;
}

export function AgendaDateStrip({ days, selectedDate, onSelectDate, className }: AgendaDateStripProps) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto scrollbar-hide pb-1", className)}>
      {days.map((day) => {
        const selected = day.date === selectedDate;
        return (
          <button
            key={day.date}
            type="button"
            onClick={() => onSelectDate(day.date)}
            aria-pressed={selected}
            className={cn(
              "flex min-w-[46px] flex-1 flex-col items-center rounded-xl border-0 px-1 py-2 transition-all active:scale-95",
              selected
                ? "bg-purple-600 text-white shadow-md shadow-purple-200"
                : day.isToday
                  ? "bg-purple-50 text-purple-700"
                  : "text-gray-600 hover:bg-gray-50 bg-transparent"
            )}
          >
            <span
              className={cn(
                "text-[10px] font-medium uppercase leading-none",
                selected ? "text-purple-200" : day.isToday ? "text-purple-500" : "text-gray-400"
              )}
            >
              {day.label}
            </span>
            <span className={cn("mt-0.5 text-lg font-bold leading-tight", selected && "text-white")}>
              {day.dayNum}
            </span>
            {(day.count ?? 0) > 0 ? (
              <div
                className={cn(
                  "mt-0.5 h-1.5 w-1.5 rounded-full",
                  selected ? "bg-white" : "bg-purple-400"
                )}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
