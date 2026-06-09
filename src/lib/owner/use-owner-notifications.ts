"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import type { OwnerNotification } from "@/lib/types";

interface NotificationsState {
  notifications: OwnerNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

/** Full notifications data + actions for the notifications page. */
export function useOwnerNotifications(): NotificationsState {
  const [notifications, setNotifications] = useState<OwnerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await adminFetch("/api/owner/notifications");
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data || []);
        setUnreadCount(json.unreadCount || 0);
        setError(null);
      } else {
        setError(json.message || "Failed to load notifications");
      }
    } catch {
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    await adminFetch("/api/owner/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await adminFetch("/api/owner/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { notifications, unreadCount, loading, error, reload, markRead, markAllRead };
}

/** Lightweight unread-count poller for the nav badge. */
export function useOwnerUnreadCount(enabled: boolean): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const load = async () => {
      try {
        const res = await adminFetch("/api/owner/notifications/unread-count");
        const json = await res.json();
        if (!cancelled && json.success) setCount(json.data?.unreadCount ?? 0);
      } catch {
        /* ignore */
      }
    };

    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled]);

  return count;
}
