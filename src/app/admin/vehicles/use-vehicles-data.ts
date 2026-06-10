"use client";

import { useCallback, type SetStateAction } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { staffKeys, useStaffQuery } from "@/lib/hooks/use-staff-query";
import type { Vehicle } from "@/lib/types";

const DEFAULT_ENDPOINT = "/api/admin/vehicles";

export function useVehiclesData(endpoint = DEFAULT_ENDPOINT) {
  const queryClient = useQueryClient();

  const query = useStaffQuery<Vehicle[]>(staffKeys.vehicles(endpoint), endpoint, {
    staleTime: 30_000,
  });

  const setVehicles = useCallback(
    (updater: SetStateAction<Vehicle[]>) => {
      queryClient.setQueryData<Vehicle[]>(staffKeys.vehicles(endpoint), (prev) =>
        typeof updater === "function" ? updater(prev ?? []) : updater
      );
    },
    [queryClient, endpoint]
  );

  const invalidateVehicles = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: staffKeys.vehicles(endpoint) });
  }, [queryClient, endpoint]);

  return {
    vehicles: query.data ?? [],
    setVehicles,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: () => query.refetch(),
    invalidateVehicles,
  };
}
