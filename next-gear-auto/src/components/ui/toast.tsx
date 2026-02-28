"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ToastType } from "@/lib/types";

interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  onDismiss: (id: string) => void;
}

const toastStyles: Record<ToastType, string> = {
  success: "border-green-500 bg-green-50 text-green-900",
  error: "border-red-500 bg-red-50 text-red-900",
  warning: "border-amber-500 bg-amber-50 text-amber-900",
  info: "border-purple-500 bg-purple-50 text-purple-900",
};

const toastIcons: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

export function ToastNotification({ id, type, title, message, onDismiss }: ToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), 5000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border-l-4 p-4 shadow-lg",
        toastStyles[type]
      )}
      role="alert"
    >
      <span className="text-lg font-bold">{toastIcons[type]}</span>
      <div className="flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {message && <p className="mt-1 text-xs opacity-80">{message}</p>}
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="rounded-md p-1 opacity-70 hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {children}
    </div>
  );
}
