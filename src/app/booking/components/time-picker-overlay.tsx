"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import { TIME_OPTIONS } from "@/app/booking/booking-constants";
import { BookingPickerOverlay } from "./booking-picker-overlay";

export function TimePickerOverlay({
  isOpen,
  onClose,
  onSelectTime,
  selectedTime,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectTime: (time: string) => void;
  selectedTime: string;
}) {
  const timeListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && timeListRef.current) {
      const selectedElement = timeListRef.current.querySelector("[data-selected='true']");
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: "instant", block: "center" });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <BookingPickerOverlay isOpen={isOpen} onClose={onClose} ariaLabel="Select time">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Time</h3>
        </div>
        <div ref={timeListRef} className="max-h-80 overflow-y-auto">
          {TIME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              data-selected={opt.value === selectedTime}
              onClick={() => {
                onSelectTime(opt.value);
                onClose();
              }}
              className={cn(
                "w-full px-6 py-4 text-left font-medium transition border-l-4",
                opt.value === selectedTime
                  ? "bg-purple-50 border-purple-600 text-purple-700 font-semibold"
                  : "bg-white border-transparent text-gray-900 hover:bg-gray-50"
              )}
            >
              {opt.display}
            </button>
          ))}
        </div>
    </BookingPickerOverlay>
  );
}
