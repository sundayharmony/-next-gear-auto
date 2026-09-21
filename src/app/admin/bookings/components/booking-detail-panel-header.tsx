"use client";

import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BookingDetailPanelHeaderProps {
  title: string;
  showEdit: boolean;
  onEdit: () => void;
  onClose: () => void;
}

export function BookingDetailPanelHeader({
  title,
  showEdit,
  onEdit,
  onClose,
}: BookingDetailPanelHeaderProps) {
  return (
    <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:px-6 lg:pt-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 truncate text-base font-semibold sm:text-xl">{title}</h2>
        <div className="flex shrink-0 items-center gap-1">
          {showEdit ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={onEdit}
              title="Edit booking"
              aria-label="Edit booking"
              className="h-10 w-10 px-0"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="nga-overlay-close inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-gray-100 px-3 text-sm font-medium text-gray-700 hover:bg-gray-200 sm:px-4"
            aria-label="Close booking details"
          >
            <X className="h-4 w-4 shrink-0" />
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  );
}
