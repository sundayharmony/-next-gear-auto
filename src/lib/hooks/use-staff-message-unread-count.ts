"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";

export function useStaffMessageUnreadCount(enabled = true, intervalMs = 15000) {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await adminFetch("/api/admin/messages/threads");
      const json = await res.json();
      if (!res.ok || !json?.success) return;
      if (json.messagingEnabled === false) {
        setCount(0);
        return;
      }
      const total =
        typeof json.unread_total === "number"
          ? json.unread_total
          : (json.data || []).reduce((sum: number, t: { unread_count?: number }) => sum + (t.unread_count || 0), 0);
      setCount(total);
    } catch {
      // best-effort polling only
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    load();
    const timer = setInterval(load, intervalMs);
    return () => clearInterval(timer);
  }, [enabled, intervalMs, load]);

  return count;
}
