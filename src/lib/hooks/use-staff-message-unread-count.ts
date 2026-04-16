"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { featureFlags } from "@/lib/config/feature-flags";

export function useStaffMessageUnreadCount(enabled = true, intervalMs = 15000) {
  const [count, setCount] = useState(0);
  const messagingEnabled = featureFlags.staffMessagingEnabled();

  const load = useCallback(async () => {
    if (!enabled || !messagingEnabled) return;
    try {
      const res = await adminFetch("/api/admin/messages/threads");
      const json = await res.json();
      if (!res.ok || !json?.success) return;
      const total = (json.data || []).reduce((sum: number, t: { unread_count?: number }) => sum + (t.unread_count || 0), 0);
      setCount(total);
    } catch {
      // best-effort polling only
    }
  }, [enabled, messagingEnabled]);

  useEffect(() => {
    if (!enabled || !messagingEnabled) return;
    load();
    const timer = setInterval(load, intervalMs);
    return () => clearInterval(timer);
  }, [enabled, messagingEnabled, intervalMs, load]);

  return count;
}
