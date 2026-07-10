"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { staffKeys } from "@/lib/hooks/use-staff-query";
import type { TuroSyncStatus } from "./blocked-dates-types";

export async function invalidateTuroDependentQueries(
  queryClient: ReturnType<typeof useQueryClient>
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["staff", "calendar"] }),
    queryClient.invalidateQueries({ queryKey: ["staff", "finances"] }),
    queryClient.invalidateQueries({ queryKey: ["staff", "blockedDates"] }),
    queryClient.invalidateQueries({ queryKey: staffKeys.bookings() }),
  ]);
}

export function useTuroSyncActions(
  fetchData: () => Promise<void>,
  setTuroSyncStatus: (status: TuroSyncStatus | null) => void,
  setSuccess: (msg: string) => void,
  setError: (msg: string) => void
) {
  const queryClient = useQueryClient();
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
        if (!data.success) {
          setError(data.message || "Could not mark trip cancelled");
          return;
        }

        const result = data.data;
        const alreadyCancelled = result.actions?.some(
          (a: { tripId: string; detail: string }) =>
            a.tripId === id && a.detail === "Already cancelled"
        );
        const tripNotFound = result.errors?.some((e: string) => e === `Trip not found: ${id}`);

        if (result.marked > 0 || result.deleted > 0) {
          await fetchData();
          await invalidateTuroDependentQueries(queryClient);
          setSuccess("Turo trip marked cancelled");
        } else if (alreadyCancelled) {
          await fetchData();
          await invalidateTuroDependentQueries(queryClient);
          setSuccess("Trip was already cancelled — list refreshed");
        } else if (tripNotFound) {
          await fetchData();
          await invalidateTuroDependentQueries(queryClient);
          setError("This trip is no longer in the database — list refreshed.");
        } else {
          setError(result.errors?.[0] || data.message || "Could not mark trip cancelled");
        }
      } catch {
        setError("Network error — could not mark trip cancelled");
      } finally {
        setCancellingId(null);
      }
    },
    [fetchData, queryClient, setError, setSuccess]
  );

  return { cancellingId, syncingStatus, refreshSyncStatus, handleMarkCancelled };
}
