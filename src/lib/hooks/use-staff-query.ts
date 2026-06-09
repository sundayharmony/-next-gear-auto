"use client";

import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query";
import { adminFetch } from "@/lib/utils/admin-fetch";

interface StaffJsonResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

export async function staffQueryFetcher<T>(url: string): Promise<T> {
  const res = await adminFetch(url);
  const json = (await res.json()) as StaffJsonResponse<T>;
  if (!res.ok || json.success === false) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }
  return (json.data ?? json) as T;
}

export function useStaffQuery<T>(
  key: readonly unknown[],
  url: string | null,
  options?: Omit<UseQueryOptions<T, Error, T, readonly unknown[]>, "queryKey" | "queryFn">
): UseQueryResult<T, Error> {
  return useQuery({
    queryKey: key,
    queryFn: () => staffQueryFetcher<T>(url!),
    enabled: Boolean(url) && (options?.enabled ?? true),
    ...options,
  });
}
