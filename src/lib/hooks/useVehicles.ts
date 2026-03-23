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

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const fetchVehicles = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/vehicles");
        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        const result = await response.json();
        if (!cancelled && result.success && Array.isArray(result.data)) {
          setVehicles(result.data);
        }
      } catch (err) {
        logger.error("Failed to fetch vehicles:", err);
        if (!cancelled) setError("Failed to load vehicles");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchVehicles();
    return () => { cancelled = true; };
  }, [enabled]);

  return { vehicles, loading, error, setVehicles };
}
