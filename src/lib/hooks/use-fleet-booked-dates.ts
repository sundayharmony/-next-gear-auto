"use client";

import { useEffect, useRef, useState } from "react";
import type { BookedRange } from "@/lib/booking/booked-ranges";
import { logger } from "@/lib/utils/logger";

const cache = new Map<string, { data: Record<string, BookedRange[]>; fetchedAt: number }>();
const CACHE_TTL_MS = 45_000;
let inflight: Promise<Record<string, BookedRange[]>> | null = null;
let inflightKey = "";

function cacheKey(vehicleIds: string[]): string {
  return [...vehicleIds].sort().join(",");
}

/**
 * Fetches booked/blocked ranges for many vehicles in one request (booking step 2).
 */
export function useFleetBookedDates(
  vehicleIds: string[],
  enabled: boolean
): {
  bookedByVehicle: Record<string, BookedRange[]>;
  loading: boolean;
  error: string | null;
  retry: () => void;
} {
  const [bookedByVehicle, setBookedByVehicle] = useState<Record<string, BookedRange[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const idsKey = cacheKey(vehicleIds);

  const retry = () => {
    cache.delete(idsKey);
    inflight = null;
    setTick((t) => t + 1);
  };

  useEffect(() => {
    if (!enabled || vehicleIds.length === 0) {
      setBookedByVehicle({});
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const key = idsKey;

    const cached = cache.get(key);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS && tick === 0) {
      setBookedByVehicle(cached.data);
      setLoading(false);
      setError(null);
      return () => {
        cancelled = true;
        controller.abort();
      };
    }

    setLoading(true);
    setError(null);

    const fetchBatch = async (): Promise<Record<string, BookedRange[]>> => {
      if (inflight && inflightKey === key) return inflight;

      inflightKey = key;
      inflight = (async () => {
        const params = new URLSearchParams();
        params.set("vehicleIds", vehicleIds.join(","));
        const res = await fetch(`/api/vehicles/booked-dates?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json.success || typeof json.data !== "object") {
          throw new Error(json.error || "Failed to load availability");
        }
        return json.data as Record<string, BookedRange[]>;
      })();

      try {
        const data = await inflight;
        cache.set(key, { data, fetchedAt: Date.now() });
        return data;
      } finally {
        inflight = null;
        inflightKey = "";
      }
    };

    fetchBatch()
      .then((data) => {
        if (!cancelled) {
          setBookedByVehicle(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled && (err as Error).name !== "AbortError") {
          logger.error("Fleet booked-dates batch fetch failed:", err);
          setError("Unable to load availability. Please try again.");
          setBookedByVehicle({});
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled, idsKey, tick]);

  return { bookedByVehicle, loading, error, retry };
}
