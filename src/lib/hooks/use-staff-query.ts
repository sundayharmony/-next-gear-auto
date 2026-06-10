"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import { adminFetch } from "@/lib/utils/admin-fetch";

interface StaffJsonResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

export const staffKeys = {
  all: ["staff"] as const,
  vehicles: (endpoint = "/api/admin/vehicles") => ["staff", "vehicles", endpoint] as const,
  bookings: (filters?: Record<string, unknown>) =>
    filters ? (["staff", "bookings", filters] as const) : (["staff", "bookings"] as const),
  blockedDates: (range: { from: string; to: string }) =>
    ["staff", "blockedDates", range] as const,
  customers: (search = "") => ["staff", "customers", search] as const,
  finances: (period?: { from: string; to: string }) =>
    period ? (["staff", "finances", period] as const) : (["staff", "finances"] as const),
  managerAnalytics: () => ["staff", "manager-analytics"] as const,
  messageUnreadCount: () => ["staff", "messages", "unread-count"] as const,
  messageThreads: (panelPath: string) => ["staff", "messages", "threads", panelPath] as const,
  calendarBookings: (endpoint: string, range: Record<string, string>) =>
    ["staff", "calendar", "bookings", endpoint, range] as const,
};

export const ownerKeys = {
  dataset: () => ["owner", "dataset"] as const,
  availability: () => ["owner", "availability"] as const,
};

export async function staffQueryFetcher<T>(url: string): Promise<T> {
  const res = await adminFetch(url);
  const json = (await res.json()) as StaffJsonResponse<T>;
  if (!res.ok || json.success === false) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }
  return (json.data ?? json) as T;
}

type StaffQueryOptions<T> = Omit<UseQueryOptions<T, Error, T, readonly unknown[]>, "queryKey" | "queryFn"> & {
  queryFn?: () => Promise<T>;
};

export function useStaffQuery<T>(
  key: readonly unknown[],
  url: string | null,
  options?: StaffQueryOptions<T>
): UseQueryResult<T, Error> {
  const { queryFn: customQueryFn, enabled, ...rest } = options ?? {};
  return useQuery({
    queryKey: key,
    queryFn: customQueryFn ?? (() => staffQueryFetcher<T>(url!)),
    enabled: Boolean(customQueryFn || url) && (enabled ?? true),
    ...rest,
  });
}

export interface StaffMutationOptions<TData, TVariables, TContext = unknown>
  extends UseMutationOptions<TData, Error, TVariables, TContext> {
  invalidateKeys?: readonly (readonly unknown[])[];
}

export function useStaffMutation<TData = unknown, TVariables = void, TContext = unknown>(
  options: StaffMutationOptions<TData, TVariables, TContext>
): UseMutationResult<TData, Error, TVariables, TContext> {
  const queryClient = useQueryClient();
  const { invalidateKeys, onSuccess, ...rest } = options;

  return useMutation({
    ...rest,
    onSuccess: (data, variables, onMutateResult, context) => {
      if (invalidateKeys) {
        for (const key of invalidateKeys) {
          void queryClient.invalidateQueries({ queryKey: key });
        }
      }
      onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}
