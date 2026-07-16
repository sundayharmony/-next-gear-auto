"use client";

import React from "react";
import {
  Bell,
  CalendarPlus,
  CalendarX,
  Pencil,
  Wallet,
  ShieldBan,
  Loader2,
  CheckCheck,
} from "lucide-react";
import {
  AdminPageHeader,
  AdminPageBody,
  adminListItemClass,
} from "@/components/admin/admin-shell";
import { AdminEmptyState } from "@/components/admin/ui-feedback";
import { Button } from "@/components/ui/button";
import { useOwnerNotifications } from "@/lib/owner/use-owner-notifications";
import { formatDate } from "@/lib/utils/date-helpers";
import type { OwnerNotification } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const ICONS: Record<OwnerNotification["type"], React.ComponentType<{ className?: string }>> = {
  booking_created: CalendarPlus,
  booking_modified: Pencil,
  booking_cancelled: CalendarX,
  payout_issued: Wallet,
  availability_changed: ShieldBan,
};

const ICON_STYLE: Record<OwnerNotification["type"], string> = {
  booking_created: "text-blue-600 bg-blue-50",
  booking_modified: "text-indigo-600 bg-indigo-50",
  booking_cancelled: "text-red-600 bg-red-50",
  payout_issued: "text-emerald-600 bg-emerald-50",
  availability_changed: "text-amber-600 bg-amber-50",
};

export default function OwnerNotificationsPage() {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useOwnerNotifications();

  return (
    <>
      <AdminPageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
        actions={
          unreadCount > 0 ? (
            <Button variant="secondary" size="sm" onClick={markAllRead}>
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          ) : undefined
        }
      />
      <AdminPageBody>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-purple-600" role="status" aria-label="Loading notifications" /></div>
        ) : notifications.length === 0 ? (
          <AdminEmptyState title="No notifications yet." />
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const Icon = ICONS[n.type] ?? Bell;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => !n.isRead && markRead(n.id)}
                  className={cn(
                    adminListItemClass,
                    "flex w-full items-start gap-3 text-left",
                    !n.isRead && "border-purple-200 bg-purple-50/40"
                  )}
                >
                  <span className={cn("mt-0.5 rounded-lg p-2", ICON_STYLE[n.type] ?? "text-gray-600 bg-gray-100")}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-gray-900">{n.title}</p>
                      {!n.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-purple-600" />}
                    </div>
                    {n.message && <p className="mt-0.5 text-sm text-gray-500">{n.message}</p>}
                    <p className="mt-1 text-xs text-gray-400">{formatDate(n.createdAt)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </AdminPageBody>
    </>
  );
}
