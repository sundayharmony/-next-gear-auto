"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { inputBase } from "./input";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

/** Parse "YYYY-MM-DD" → Date in local timezone (avoids UTC offset issues) */
function parseLocal(iso: string): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Date → "YYYY-MM-DD" */
function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Format for display: "Apr 5, 2026" */
function formatDisplay(iso: string): string {
  const date = parseLocal(iso);
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

export interface DatePickerProps {
  /** Value in "YYYY-MM-DD" format (same as native date input) */
  value?: string;
  /** Callback with "YYYY-MM-DD" string */
  onChange?: (value: string) => void;
  /** Min date in "YYYY-MM-DD" */
  min?: string;
  /** Max date in "YYYY-MM-DD" */
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  error?: string;
  id?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function DatePicker({
  value = "",
  onChange,
  min,
  max,
  placeholder = "Select date",
  disabled = false,
  className,
  label,
  error,
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Calendar view state — default to selected date's month, or today
  const selected = parseLocal(value);
  const [viewYear, setViewYear] = React.useState(
    () => selected?.getFullYear() ?? new Date().getFullYear()
  );
  const [viewMonth, setViewMonth] = React.useState(
    () => selected?.getMonth() ?? new Date().getMonth()
  );

  // Sync view to selected date when value changes externally
  React.useEffect(() => {
    if (selected) {
      setViewYear(selected.getFullYear());
      setViewMonth(selected.getMonth());
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const minDate = parseLocal(min ?? "");
  const maxDate = parseLocal(max ?? "");

  function isDisabled(date: Date): boolean {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function selectDate(date: Date) {
    onChange?.(toISO(date));
    setOpen(false);
  }

  // Build calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
  const totalSlots = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const cells: (Date | null)[] = [];
  for (let i = 0; i < totalSlots; i++) {
    const dayNum = i - firstDay + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push(null);
    } else {
      cells.push(new Date(viewYear, viewMonth, dayNum));
    }
  }

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="nga-label mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500"
        >
          {label}
        </label>
      )}

      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild disabled={disabled}>
          <button
            type="button"
            id={id}
            className={cn(
              inputBase,
              "text-left justify-between items-center gap-2",
              !value && "text-gray-400",
              error
                ? "border-red-400 focus:ring-red-500/20 focus:border-red-500 bg-red-50/50"
                : "border-gray-200 hover:border-purple-300 hover:bg-white",
              disabled && "cursor-not-allowed bg-gray-100 text-gray-400",
              className
            )}
            aria-invalid={error ? "true" : undefined}
          >
            <span className="truncate">
              {value ? formatDisplay(value) : placeholder}
            </span>
            <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            className="z-[9999] w-[280px] rounded-xl border border-gray-200 bg-white p-3 shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
            sideOffset={4}
            align="start"
          >
            {/* Month/Year header */}
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={prevMonth}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-gray-900">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="mb-1 grid grid-cols-7 text-center">
              {DAYS.map((d) => (
                <span
                  key={d}
                  className="text-[10px] font-medium uppercase text-gray-400"
                >
                  {d}
                </span>
              ))}
            </div>

            {/* Date grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((date, i) => {
                if (!date) {
                  return <span key={`empty-${i}`} />;
                }

                const sel = selected && isSameDay(date, selected);
                const today = isToday(date);
                const off = isDisabled(date);

                return (
                  <button
                    key={toISO(date)}
                    type="button"
                    disabled={off}
                    onClick={() => selectDate(date)}
                    className={cn(
                      "flex h-8 w-full items-center justify-center rounded-lg text-sm transition-colors",
                      sel
                        ? "bg-purple-600 font-semibold text-white"
                        : today
                          ? "font-semibold text-purple-600"
                          : "text-gray-700",
                      !sel && !off && "hover:bg-purple-50 hover:text-purple-700",
                      off && "cursor-not-allowed text-gray-300"
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Today shortcut */}
            <div className="mt-2 border-t border-gray-100 pt-2">
              <button
                type="button"
                onClick={() => selectDate(new Date())}
                disabled={isDisabled(new Date())}
                className="w-full rounded-lg py-1.5 text-xs font-medium text-purple-600 transition-colors hover:bg-purple-50 disabled:cursor-not-allowed disabled:text-gray-300"
              >
                Today
              </button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
