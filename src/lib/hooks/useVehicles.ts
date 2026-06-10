"use client";

import { useState, useEffect } from "react";
import type { PublicVehicleJson } from "@/lib/vehicles/public-vehicle-fields";
import { logger } from "@/lib/utils/logger";

/** Shared in-memory cache so fleet, booking, and account do not refetch on every mount. */
const CACHE_TTL_MS = 60_000;

export interface UseVehiclesOptions {
  /** SSR-seeded list — skips client refetch on first mount when non-empty. */
  initialVehicles?: PublicVehicleJson[];
}

/** Prime the shared cache from RSC/SSR data. */
export function seedVehiclesCache(vehicles: PublicVehicleJson[]) {
  if (vehicles.length === 0) return;
  cache = { entry: { vehicles, error: null }, fetchedAt: Date.now() };
}

interface VehiclesCacheEntry {
  vehicles: PublicVehicleJson[];
  error: string | null;
}

let cache: { entry: VehiclesCacheEntry; fetchedAt: number } | null = null;
let inflight: Promise<VehiclesCacheEntry> | null = null;

function invalidateVehiclesCache() {
  cache = null;
  inflight = null;
}

async function fetchVehiclesFromApi(signal?: AbortSignal): Promise<VehiclesCacheEntry> {
  const response = await fetch("/api/vehicles", { signal });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  const result = await response.json();
  if (result.success && Array.isArray(result.data)) {
    return { vehicles: result.data, error: null };
  }
  return { vehicles: [], error: "Failed to load vehicles" };
}

function loadVehiclesShared(signal?: AbortSignal): Promise<VehiclesCacheEntry> {
  if (
    cache &&
    Date.now() - cache.fetchedAt < CACHE_TTL_MS
  ) {
    return Promise.resolve(cache.entry);
  }

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const entry = await fetchVehiclesFromApi(signal);
      cache = { entry, fetchedAt: Date.now() };
      return entry;
    } catch (err) {
      if (signal?.aborted) throw err;
      logger.error("Failed to fetch vehicles:", err);
      const entry: VehiclesCacheEntry = {
        vehicles: [],
        error: "Failed to load vehicles",
      };
      return entry;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/**
 * Shared hook for fetching the public vehicle list.
 * Used by fleet pages, booking flow, and account page.
 *
 * @param enabled - Whether to fetch on mount (default: true).
 *                  Pass `false` if fetch should be deferred (e.g. until auth is ready).
 */
export function useVehicles(enabled = true, options?: UseVehiclesOptions) {
  const { initialVehicles } = options ?? {};
  const hasSsrSeed = Boolean(initialVehicles && initialVehicles.length > 0);

  const [vehicles, setVehicles] = useState<PublicVehicleJson[]>(() => {
    if (hasSsrSeed) return initialVehicles!;
    return cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS ? cache.entry.vehicles : [];
  });
  const [loading, setLoading] = useState(() => {
    if (hasSsrSeed) return false;
    return !(cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS);
  });
  const [error, setError] = useState<string | null>(() =>
    cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS ? cache.entry.error : null
  );
  const [refetchCount, setRefetchCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    if (hasSsrSeed && refetchCount === 0) {
      seedVehiclesCache(initialVehicles!);
      setVehicles(initialVehicles!);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const hasFreshCache =
      cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS && refetchCount === 0;

    if (!hasFreshCache) {
      setLoading(true);
      setError(null);
    }

    loadVehiclesShared(controller.signal)
      .then((entry) => {
        clearTimeout(timeoutId);
        if (!cancelled) {
          setVehicles(entry.vehicles);
          setError(entry.error);
        }
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        if (!cancelled && !controller.signal.aborted) {
          setError("Failed to load vehicles");
          logger.error("Failed to fetch vehicles:", err);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [enabled, refetchCount, hasSsrSeed, initialVehicles]);

  const retry = () => {
    invalidateVehiclesCache();
    setRefetchCount((c) => c + 1);
  };

  return { vehicles, loading, error, setVehicles, retry };
}
