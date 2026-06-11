"use client";

import React, { useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetBody } from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";

interface CreateBookingShellProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
}

export function CreateBookingShell({ open, onClose, children }: CreateBookingShellProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocusRef.current = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => {
      const root = contentRef.current;
      if (!root) return;
      const focusable = getFocusable(root);
      focusable[0]?.focus();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !contentRef.current) return;
      const focusable = getFocusable(contentRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      onClose();
      window.setTimeout(() => lastFocusRef.current?.focus(), 0);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        showClose
        className={cn(
          "p-0 gap-0",
          "md:inset-y-0 md:left-auto md:right-0 md:bottom-auto md:top-0 md:max-h-none md:h-full md:w-full md:max-w-2xl md:rounded-none md:rounded-l-2xl md:slide-in-from-right"
        )}
      >
        <SheetBody className="p-0 sm:p-0">
          <div ref={contentRef}>{children}</div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
