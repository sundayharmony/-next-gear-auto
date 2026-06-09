"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useStaffNotifications } from "@/lib/hooks/use-staff-notifications";

interface AdminPendingBookingsPluginProps {
  enabled: boolean;
  isDark: boolean;
  variant: "mobile" | "sidebar";
}

export function AdminPendingBookingsPlugin({
  enabled,
  isDark,
  variant,
}: AdminPendingBookingsPluginProps) {
  const { pendingCount, recentBookings, refetch } = useStaffNotifications(enabled);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationPosition, setNotificationPosition] = useState({ top: 80, left: 16 });
  const bellButtonRef = useRef<HTMLButtonElement>(null);
  const notificationsCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showNotifications) setShowNotifications(false);
    };
    window.addEventListener("keydown", handleEscapeKey);
    return () => window.removeEventListener("keydown", handleEscapeKey);
  }, [showNotifications]);

  useEffect(() => {
    if (!showNotifications) return;
    const t = window.setTimeout(() => notificationsCloseRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [showNotifications]);

  useEffect(() => {
    if (!showNotifications) return;
    const updatePosition = () => {
      const rect = bellButtonRef.current?.getBoundingClientRect();
      const top = rect ? rect.bottom + 8 : 80;
      const preferredLeft = rect ? rect.right - 320 : 16;
      const left = Math.max(16, Math.min(preferredLeft, window.innerWidth - 336));
      setNotificationPosition({ top, left });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [showNotifications]);

  const bellButton = (
    <button
      ref={bellButtonRef}
      type="button"
      onClick={() => {
        setShowNotifications((v) => !v);
        if (!showNotifications) void refetch();
      }}
      aria-label={`Notifications${pendingCount > 0 ? ` — ${pendingCount} pending` : ""}`}
      aria-expanded={showNotifications}
      className={cn(
        variant === "mobile"
          ? cn(
              "relative p-2.5 rounded-full transition-colors active:scale-90",
              pendingCount > 0 ? "bg-purple-50" : "hover:bg-gray-100 active:bg-gray-200"
            )
          : cn(
              "relative p-2 rounded-lg transition-colors",
              pendingCount > 0
                ? "bg-purple-600/20 hover:bg-purple-600/30"
                : "hover:bg-gray-800"
            )
      )}
    >
      <Bell
        className={cn(
          variant === "mobile" ? "h-[22px] w-[22px]" : "h-5 w-5",
          pendingCount > 0
            ? variant === "mobile"
              ? "text-purple-600"
              : "text-white"
            : variant === "mobile"
              ? "text-gray-500"
              : isDark
                ? "text-gray-400"
                : "text-gray-500"
        )}
      />
      {pendingCount > 0 && (
        <span
          className={cn(
            "absolute bg-red-500 text-white font-bold rounded-full flex items-center justify-center ring-2",
            variant === "mobile"
              ? "top-1 right-1 text-[10px] min-w-[18px] h-[18px] px-1 ring-white"
              : "-top-1.5 -right-1.5 text-[10px] min-w-[20px] h-[20px] px-1.5",
            variant === "sidebar" && (isDark ? "ring-[#111111]" : "ring-gray-900")
          )}
        >
          {pendingCount}
        </span>
      )}
    </button>
  );

  const dropdown = showNotifications ? (
    <>
      <div className="fixed inset-0 z-[55]" onClick={() => setShowNotifications(false)} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-notifications-title"
        className="fixed w-80 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 z-[60] overflow-hidden"
        style={notificationPosition}
      >
        <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
          <h3 id="admin-notifications-title" className="text-sm font-semibold text-gray-900">
            Pending Bookings
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {pendingCount}
              </span>
            )}
          </h3>
          <button
            ref={notificationsCloseRef}
            type="button"
            onClick={() => setShowNotifications(false)}
            className="p-1.5 rounded-full hover:bg-gray-200 active:bg-gray-300 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close notifications"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {recentBookings.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No pending bookings</p>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
            {recentBookings.map((b) => (
              <Link
                key={b.id}
                href={`/admin/bookings?booking=${b.id}`}
                onClick={() => setShowNotifications(false)}
                className="flex items-center justify-between px-4 py-3 hover:bg-purple-50 active:bg-purple-100 transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate group-hover:text-purple-700">
                    {b.customer_name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {b.created_at
                      ? new Date(b.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "—"}
                  </p>
                </div>
                <span className="text-sm font-bold text-purple-600 ml-3">
                  ${(b.total_price ?? 0).toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
        )}
        <Link
          href="/admin/bookings?status=pending"
          onClick={() => setShowNotifications(false)}
          className="block px-4 py-3 text-center text-xs font-semibold text-purple-600 hover:bg-purple-50 active:bg-purple-100 border-t transition-colors"
        >
          View all pending bookings →
        </Link>
      </div>
    </>
  ) : null;

  if (variant === "mobile") {
    return (
      <>
        {bellButton}
        {dropdown}
      </>
    );
  }

  return (
    <>
      {bellButton}
      {dropdown}
    </>
  );
}
