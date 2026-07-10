"use client";

import { useCallback, useState } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import type { TuroSyncStatus } from "./blocked-dates-types";

export function useTuroSyncActions(
  fetchData: () => Promise<void>,
  setTuroSyncStatus: (status: TuroSyncStatus | null) => void,
  setSuccess: (msg: string) => void,
  setError: (msg: string) => void
) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [syncingStatus, setSyncingStatus] = useState(false);

  const refreshSyncStatus = useCallback(async () => {
    setSyncingStatus(true);
    try {
      const syncRes = await adminFetch("/api/admin/blocked-dates/sync-cancellations");
      if (syncRes.ok) {
        const syncData = await syncRes.json();
        if (syncData.success) setTuroSyncStatus(syncData.data);
      }
    } finally {
      setSyncingStatus(false);
    }
  }, [setTuroSyncStatus]);

  const handleMarkCancelled = useCallback(
    async (id: string) => {
      if (
        !window.confirm(
          "Mark this Turo trip as cancelled? It will be hidden from the calendar but kept for audit."
        )
      ) {
        return;
      }
      setCancellingId(id);
      try {
        const res = await adminFetch("/api/admin/blocked-dates/sync-cancellations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tripIds: [id], purgeAlreadyCancelled: false }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success && data.data.marked > 0) {
          await fetchData();
          setSuccess("Turo trip marked cancelled");
        } else if (data.data?.errors?.[0]?.includes("Trip not found")) {
          // Trip not found in sync endpoint - try direct deletion as fallback
          const shouldDelete = window.confirm(
            "This trip was not found in the Turo sync records. It may have already been processed or the data is out of sync.\n\nWould you like to delete this blocked date directly instead?"
          );
          if (shouldDelete) {
            const deleteRes = await adminFetch(`/api/admin/blocked-dates?id=${encodeURIComponent(id)}`, {
              method: "DELETE",
            });
            if (deleteRes.ok) {
              const deleteData = await deleteRes.json();
              if (deleteData.success) {
                await fetchData();
                setSuccess("Blocked date removed successfully");
                return;
              }
            }
            setError("Could not delete the blocked date. It may have already been removed.");
          }
          // Refresh the data to clear stale entries
          await fetchData();
        } else {
          setError(data.data?.errors?.[0] || data.message || "Could not mark trip cancelled");
        }
      } catch {
        setError("Network error — could not mark trip cancelled");
      } finally {
        setCancellingId(null);
      }
    },
    [fetchData, setError, setSuccess]
  );

  return { cancellingId, syncingStatus, refreshSyncStatus, handleMarkCancelled };
}
