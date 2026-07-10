import React from "react";
import { AlertCircle, CheckCircle2, Inbox } from "lucide-react";

interface AdminStatusBannerProps {
  type: "error" | "success";
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function AdminStatusBanner({
  type,
  message,
  onDismiss,
  className = "",
}: AdminStatusBannerProps) {
  const styles =
    type === "error"
      ? "bg-red-50 border-red-200 text-red-700"
      : "bg-green-50 border-green-200 text-green-700";
  const Icon = type === "error" ? AlertCircle : CheckCircle2;

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`mb-4 rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3 text-sm flex items-start sm:items-center justify-between gap-2 sm:gap-3 ${styles} ${className}`}
    >
      <div className="flex items-start sm:items-center gap-2 min-w-0">
        <Icon className="h-4 w-4 shrink-0 mt-0.5 sm:mt-0" />
        <span className="break-words">{message}</span>
      </div>
      {onDismiss ? (
        <button
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="shrink-0 text-current/70 hover:text-current mt-0.5 sm:mt-0"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

interface AdminEmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function AdminEmptyState({ title, description, action }: AdminEmptyStateProps) {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white shadow-sm px-6 py-10 text-center">
      <Inbox className="mx-auto h-8 w-8 text-gray-300" />
      <h3 className="mt-3 text-sm font-semibold text-gray-900">{title}</h3>
      {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
