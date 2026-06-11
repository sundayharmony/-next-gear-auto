"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";
import { getLocalYmd } from "@/lib/utils/date-helpers";

export interface AgendaDateStripDay {
  date: string;
  label: string;
  dayNum: number;
  isToday: boolean;
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
              "flex min-w-[52px] flex-col items-center rounded-xl border px-2 py-2 transition-colors",
              selected
                ? "border-purple-600 bg-purple-600 text-white"
                : day.isToday
                  ? "border-purple-300 bg-purple-50 text-purple-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-purple-200"
            )}
          >
            <span className="text-[10px] font-medium uppercase">{day.label}</span>
            <span className="text-lg font-bold leading-tight">{day.dayNum}</span>
          </button>
        );
      })}
    </div>
  );
}
