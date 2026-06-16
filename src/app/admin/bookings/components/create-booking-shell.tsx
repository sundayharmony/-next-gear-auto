"use client";

import React from "react";
import { Sheet, SheetContent, SheetBody } from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";

interface CreateBookingShellProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function CreateBookingShell({ open, onClose, children }: CreateBookingShellProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="bottom"
        tier="staff"
        showClose={false}
        className={cn(
          "p-0 gap-0 max-h-[100dvh] md:max-h-none",
          "md:inset-y-0 md:left-auto md:right-0 md:bottom-auto md:top-0 md:h-full md:w-full md:max-w-2xl md:rounded-none md:rounded-l-2xl md:slide-in-from-right"
        )}
      >
        <SheetBody className="flex flex-col p-0 sm:p-0 overflow-hidden">
          {children}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
