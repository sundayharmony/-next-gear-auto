"use client";

import React, { createContext, useCallback, useContext } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { ownerKeys, useStaffQuery } from "@/lib/hooks/use-staff-query";
import type { OwnerBooking, OwnerDashboardMetrics, OwnerVehicle } from "@/lib/types";

interface OwnerDataset {
  metrics: OwnerDashboardMetrics;
  bookings: OwnerBooking[];
  vehicles: OwnerVehicle[];
}

interface OwnerDataContextValue {
  metrics: OwnerDashboardMetrics | null;
  bookings: OwnerBooking[];
  vehicles: OwnerVehicle[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const OwnerDataContext = createContext<OwnerDataContextValue | null>(null);

async function fetchOwnerDataset(): Promise<OwnerDataset> {
  const res = await adminFetch("/api/owner/dataset");
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to load owner dataset");
  }
  return json.data as OwnerDataset;
}

export function OwnerDataProvider({ children }: { children: React.ReactNode }) {
  const query = useStaffQuery<OwnerDataset>(
    ownerKeys.dataset(),
    null,
    {
      queryFn: fetchOwnerDataset,
      staleTime: 30_000,
    }
  );

  const reload = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return (
    <OwnerDataContext.Provider
      value={{
        metrics: query.data?.metrics ?? null,
        bookings: query.data?.bookings ?? [],
        vehicles: query.data?.vehicles ?? [],
        loading: query.isLoading,
        error: query.error?.message ?? null,
        reload,
      }}
    >
      {children}
    </OwnerDataContext.Provider>
  );
}

export function useOwnerData(): OwnerDataContextValue {
  const ctx = useContext(OwnerDataContext);
  if (!ctx) {
    throw new Error("useOwnerData must be used within OwnerDataProvider");
  }
  return ctx;
}
