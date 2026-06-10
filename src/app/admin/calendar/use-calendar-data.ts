"use client";

import { useCallback, useMemo, type SetStateAction } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { VehicleListItem } from "@/lib/types";
import { staffKeys, useStaffQuery } from "@/lib/hooks/use-staff-query";
import { addDaysToYmd, getLocalYmd } from "@/lib/utils/date-helpers";
import { logger } from "@/lib/utils/logger";
import type { BookingRow as AdminBookingRow } from "@/app/admin/bookings/types";
import type { BlockedDateEntry } from "./calendar-model";

const TIMELINE_WINDOW_DAYS = 180;

interface UseCalendarDataOptions {
  bookingsEndpoint: string;
  view: "timeline" | "calendar";
  timelineStart: Date;
  calendarMonthStart: Date;
}

function filterActiveBookings(rows: AdminBookingRow[]): AdminBookingRow[] {
  return rows.filter((b) => b.status !== "cancelled");
}

export function useCalendarData({
  bookingsEndpoint,
  view,
  timelineStart,
  calendarMonthStart,
}: UseCalendarDataOptions) {
  const queryClient = useQueryClient();
  const isManagerAll = bookingsEndpoint === "/api/manager/bookings";

  const vehiclesQuery = useStaffQuery<VehicleListItem[]>(
    staffKeys.vehicles("/api/admin/vehicles"),
    "/api/admin/vehicles",
    { staleTime: 60_000 }
  );
  const vehicles = vehiclesQuery.data ?? [];

  const visibleBounds = useMemo(() => {
    if (view === "timeline") {
      const start = new Date(timelineStart);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + (TIMELINE_WINDOW_DAYS - 1));
      return { from: getLocalYmd(start), to: getLocalYmd(end) };
    }
    const y = calendarMonthStart.getFullYear();
    const m = calendarMonthStart.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    return { from: getLocalYmd(first), to: getLocalYmd(last) };
  }, [view, timelineStart, calendarMonthStart]);

  const bookingsRange = useMemo(
    () => ({
      from: addDaysToYmd(visibleBounds.from, -120),
      to: addDaysToYmd(visibleBounds.to, 120),
    }),
    [visibleBounds]
  );

  const bookingsRangeKey = useMemo(
    () => (isManagerAll ? ({ mode: "all" } as const) : bookingsRange),
    [isManagerAll, bookingsRange]
  );

  const bookingsUrl = isManagerAll
    ? `${bookingsEndpoint}?status=all&includeTuro=true`
    : `${bookingsEndpoint}?from=${bookingsRange.from}&to=${bookingsRange.to}&limit=200&includeTuro=true`;

  const bookingsQuery = useStaffQuery<AdminBookingRow[]>(
    staffKeys.calendarBookings(bookingsEndpoint, bookingsRangeKey),
    bookingsUrl,
    {
      select: filterActiveBookings,
      staleTime: 30_000,
      placeholderData: (prev) => prev,
    }
  );

  const bookings = bookingsQuery.data ?? [];

  const blockedRange = useMemo(
    () => ({
      from: addDaysToYmd(visibleBounds.from, -120),
      to: addDaysToYmd(visibleBounds.to, 120),
    }),
    [visibleBounds]
  );

  const blockedDatesUrl = `/api/admin/blocked-dates?from=${encodeURIComponent(blockedRange.from)}&to=${encodeURIComponent(blockedRange.to)}`;

  const blockedDatesQuery = useStaffQuery<BlockedDateEntry[]>(
    staffKeys.blockedDates(blockedRange),
    blockedDatesUrl,
    {
      select: (rows) => rows.filter((bd) => bd.source !== "turo-email"),
      staleTime: 30_000,
    }
  );

  const blockedDates = blockedDatesQuery.data ?? [];

  const setBookings = useCallback(
    (updater: SetStateAction<AdminBookingRow[]>) => {
      queryClient.setQueryData<AdminBookingRow[]>(
        staffKeys.calendarBookings(bookingsEndpoint, bookingsRangeKey),
        (prev) => {
          const current = prev ?? [];
          return typeof updater === "function" ? updater(current) : updater;
        }
      );
    },
    [queryClient, bookingsEndpoint, bookingsRangeKey]
  );

  const loadBookings = useCallback(
    async (options?: { forceReplace?: boolean }) => {
      if (options?.forceReplace) {
        await queryClient.invalidateQueries({
          queryKey: staffKeys.calendarBookings(bookingsEndpoint, bookingsRangeKey),
        });
      }
      await bookingsQuery.refetch();
    },
    [bookingsQuery, queryClient, bookingsEndpoint, bookingsRangeKey]
  );

  const handleRefresh = useCallback(async () => {
    try {
      await Promise.all([
        loadBookings({ forceReplace: true }),
        blockedDatesQuery.refetch(),
        vehiclesQuery.refetch(),
      ]);
    } catch (error) {
      logger.error("Failed to refresh calendar data:", error);
    }
  }, [loadBookings, blockedDatesQuery, vehiclesQuery]);

  const loading =
    bookingsQuery.isLoading ||
    blockedDatesQuery.isLoading ||
    vehiclesQuery.isLoading;

  return {
    bookings,
    setBookings,
    vehicles,
    blockedDates,
    loading,
    loadBookings,
    handleRefresh,
  };
}
