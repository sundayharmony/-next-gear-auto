"use client";

import { useState, useEffect } from "react";
import type { Vehicle } from "@/lib/types";
import { logger } from "@/lib/utils/logger";

/**
 * Shared hook for fetching the public vehicle list.
 * Used by fleet pages, booking flow, and account page.
 *
 * @param enabled - Whether to fetch on mount (default: true).
 *                  Pass `false` if fetch should be deferred (e.g. until auth is ready).
 */
export function useVehicles(enabled = true) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchCount, setRefetchCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const controller = new AbortController();
    const fetchVehicles = async () => {
      setLoading(true);
      setError(null); // Clear previous error state
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

      try {
        const response = await fetch("/api/vehicles", { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        const result = await response.json();
        if (!cancelled && result.success && Array.isArray(result.data)) {
          setVehicles(result.data);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (!cancelled) {
          logger.error("Failed to fetch vehicles:", err);
          setError("Failed to load vehicles");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchVehicles();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled, refetchCount]);

  const retry = () => setRefetchCount(c => c + 1);

  return { vehicles, loading, error, setVehicles, retry };
}
