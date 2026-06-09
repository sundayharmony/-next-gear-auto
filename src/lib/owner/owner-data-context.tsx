"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import type { OwnerBooking, OwnerDashboardMetrics, OwnerVehicle } from "@/lib/types";

interface OwnerDataContextValue {
  metrics: OwnerDashboardMetrics | null;
  bookings: OwnerBooking[];
  vehicles: OwnerVehicle[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const OwnerDataContext = createContext<OwnerDataContextValue | null>(null);

export function OwnerDataProvider({ children }: { children: React.ReactNode }) {
  const [metrics, setMetrics] = useState<OwnerDashboardMetrics | null>(null);
  const [bookings, setBookings] = useState<OwnerBooking[]>([]);
  const [vehicles, setVehicles] = useState<OwnerVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, bookingsRes, vehiclesRes] = await Promise.all([
        adminFetch("/api/owner/summary"),
        adminFetch("/api/owner/bookings"),
        adminFetch("/api/owner/vehicles"),
      ]);
      const [summaryJson, bookingsJson, vehiclesJson] = await Promise.all([
        summaryRes.json(),
        bookingsRes.json(),
        vehiclesRes.json(),
      ]);

      if (!summaryRes.ok || !summaryJson.success) {
        throw new Error(summaryJson.message || "Failed to load owner summary");
      }
      if (!bookingsRes.ok || !bookingsJson.success) {
        throw new Error(bookingsJson.message || "Failed to load owner bookings");
      }
      if (!vehiclesRes.ok || !vehiclesJson.success) {
        throw new Error(vehiclesJson.message || "Failed to load owner vehicles");
      }

      setMetrics(summaryJson.data as OwnerDashboardMetrics);
      setBookings((bookingsJson.data as OwnerBooking[]) || []);
      setVehicles((vehiclesJson.data as OwnerVehicle[]) || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load owner data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <OwnerDataContext.Provider value={{ metrics, bookings, vehicles, loading, error, reload }}>
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
