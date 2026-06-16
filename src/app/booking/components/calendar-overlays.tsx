"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatYyyyMmDdLocal, localMidnightFromYyyyMmDd } from "@/lib/utils/booking-dates";
import type { SearchDatesState } from "@/lib/booking/wizard-validation";
import { BookingPickerOverlay } from "./booking-picker-overlay";

function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getFirstDayOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
}

export function CalendarOverlay({
  isOpen,
  onClose,
  onSelectDate,
  isPickup,
  searchDates,
  calendarViewDate,
  setCalendarViewDate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void;
  isPickup: boolean;
  searchDates: SearchDatesState;
  calendarViewDate: Date;
  setCalendarViewDate: (date: Date) => void;
}) {
  if (!isOpen) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minDate = new Date(today);
  if (!isPickup && searchDates.pickup) {
    const pickupDate = localMidnightFromYyyyMmDd(searchDates.pickup);
    if (!isNaN(pickupDate.getTime())) {
      minDate.setTime(Math.max(minDate.getTime(), pickupDate.getTime()));
    }
  }

  const daysInMonth = getDaysInMonth(calendarViewDate);
  const firstDay = getFirstDayOfMonth(calendarViewDate);
  const days: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), i));
  }

  const monthYear = calendarViewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const handleDayClick = (day: Date) => {
    onSelectDate(formatYyyyMmDdLocal(day));
    onClose();
  };

  return (
    <BookingPickerOverlay
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={isPickup ? "Select pickup date" : "Select return date"}
      panelClassName="bg-white/95 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl max-w-sm w-full mx-4 shadow-2xl p-6 animate-in outline-none"
    >
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1))} aria-label="Previous month" className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h3 className="text-lg font-semibold text-gray-900" aria-live="polite">{monthYear}</h3>
          <button onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1))} aria-label="Next month" className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-gray-500 h-11 flex items-center justify-center">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day, idx) => {
            const isDisabled = day === null || day < minDate;
            const isSelected =
              day !== null && formatYyyyMmDdLocal(day) === (isPickup ? searchDates.pickup : searchDates.return);
            return (
              <button
                key={idx}
                onClick={() => day && !isDisabled && handleDayClick(day)}
                disabled={isDisabled}
                className={cn(
                  "h-11 w-11 rounded-lg font-medium transition flex items-center justify-center text-sm",
                  isDisabled ? "text-gray-300 cursor-not-allowed" : "text-gray-900 hover:bg-gray-100",
                  isSelected ? "bg-purple-600 text-white font-semibold hover:bg-purple-700" : ""
                )}
              >
                {day ? day.getDate() : ""}
              </button>
            );
          })}
        </div>
    </BookingPickerOverlay>
  );
}

export function BirthdayCalendarOverlay({
  isOpen,
  onClose,
  onSelectDate,
  selectedDate,
  dobViewDate,
  setDobViewDate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void;
  selectedDate: string;
  dobViewDate: Date;
  setDobViewDate: (date: Date) => void;
}) {
  if (!isOpen) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

  const daysInMonth = getDaysInMonth(dobViewDate);
  const firstDay = getFirstDayOfMonth(dobViewDate);
  const days: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(dobViewDate.getFullYear(), dobViewDate.getMonth(), i));
  }

  const monthYear = dobViewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const handleDayClick = (day: Date) => {
    onSelectDate(formatYyyyMmDdLocal(day));
    onClose();
  };

  return (
    <BookingPickerOverlay
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Select date of birth"
      panelClassName="bg-white/95 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl max-w-sm w-full mx-4 shadow-2xl p-6 animate-in outline-none"
    >
        <div className="flex items-center justify-center gap-3 mb-2">
          <button onClick={() => setDobViewDate(new Date(dobViewDate.getFullYear() - 1, dobViewDate.getMonth()))} className="px-2 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition">
            ‹‹ Year
          </button>
          <span className="text-sm font-bold text-gray-900 min-w-[3rem] text-center">{dobViewDate.getFullYear()}</span>
          <button
            onClick={() => {
              const next = new Date(dobViewDate.getFullYear() + 1, dobViewDate.getMonth());
              if (next <= maxDate) setDobViewDate(next);
            }}
            disabled={new Date(dobViewDate.getFullYear() + 1, dobViewDate.getMonth()) > maxDate}
            className="px-2 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Year ››
          </button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setDobViewDate(new Date(dobViewDate.getFullYear(), dobViewDate.getMonth() - 1))} aria-label="Previous month" className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h3 className="text-lg font-semibold text-gray-900">{monthYear}</h3>
          <button
            onClick={() => {
              const next = new Date(dobViewDate.getFullYear(), dobViewDate.getMonth() + 1);
              if (next <= maxDate) setDobViewDate(next);
            }}
            disabled={new Date(dobViewDate.getFullYear(), dobViewDate.getMonth() + 1) > maxDate}
            aria-label="Next month"
            className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-gray-500 h-11 flex items-center justify-center">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day, idx) => {
            const isFuture = day !== null && day > maxDate;
            const isDisabled = day === null || isFuture;
            const isSelected = day !== null && formatYyyyMmDdLocal(day) === selectedDate;
            return (
              <button
                key={idx}
                onClick={() => day && !isDisabled && handleDayClick(day)}
                disabled={isDisabled}
                className={cn(
                  "h-11 w-11 rounded-lg font-medium transition flex items-center justify-center text-sm",
                  isDisabled ? "text-gray-300 cursor-not-allowed" : "text-gray-900 hover:bg-gray-100",
                  isSelected ? "bg-purple-600 text-white font-semibold hover:bg-purple-700" : ""
                )}
              >
                {day ? day.getDate() : ""}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">Must be 18 years or older</p>
    </BookingPickerOverlay>
  );
}

export function formatDateForInput(dateStr: string) {
  if (!dateStr) return "";
  const date = localMidnightFromYyyyMmDd(dateStr);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
