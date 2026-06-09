"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VehicleListItem } from "@/lib/types";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { useStaffQuery } from "@/lib/hooks/use-staff-query";
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

export function useCalendarData({
  bookingsEndpoint,
  view,
  timelineStart,
  calendarMonthStart,
}: UseCalendarDataOptions) {
  const [bookings, setBookings] = useState<AdminBookingRow[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const vehiclesQuery = useStaffQuery<VehicleListItem[]>(
    ["staff", "vehicles", "/api/admin/vehicles"],
    "/api/admin/vehicles",
    { staleTime: 60_000 }
  );
  const vehicles = vehiclesQuery.data ?? [];

  const bookingsAbortControllerRef = useRef<AbortController | null>(null);
  const bookingsRangeRef = useRef<{ from: string; to: string } | null>(null);
  const bookingsEndpointRef = useRef(bookingsEndpoint);
  const managerBookingsFetchedRef = useRef(false);
  const calendarAuxLoadedRef = useRef(false);

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

  const loadBookings = useCallback(
    async (options?: { forceReplace?: boolean }) => {
      const forceReplace = options?.forceReplace ?? false;

      if (bookingsEndpointRef.current !== bookingsEndpoint) {
        bookingsEndpointRef.current = bookingsEndpoint;
        bookingsRangeRef.current = null;
        managerBookingsFetchedRef.current = false;
      }
      if (forceReplace) {
        bookingsRangeRef.current = null;
        managerBookingsFetchedRef.current = false;
      }

      if (bookingsAbortControllerRef.current) {
        bookingsAbortControllerRef.current.abort();
      }
      bookingsAbortControllerRef.current = new AbortController();
      const signal = bookingsAbortControllerRef.current.signal;

      if (bookingsEndpoint === "/api/manager/bookings") {
        if (!forceReplace && managerBookingsFetchedRef.current) return;
        try {
          const res = await adminFetch(`${bookingsEndpoint}?status=all&includeTuro=true`, { signal });
          if (res.ok) {
            const data = await res.json();
            setBookings((data.data || []).filter((b: AdminBookingRow) => b.status !== "cancelled"));
            managerBookingsFetchedRef.current = true;
          }
          bookingsRangeRef.current = null;
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") return;
          logger.error("Failed to fetch bookings:", error);
        }
        return;
      }

      const needFrom = addDaysToYmd(visibleBounds.from, -120);
      const needTo = addDaysToYmd(visibleBounds.to, 120);
      const loaded = bookingsRangeRef.current;

      if (!forceReplace && loaded && needFrom >= loaded.from && needTo <= loaded.to) {
        return;
      }

      const newFrom = !loaded || forceReplace ? needFrom : needFrom < loaded.from ? needFrom : loaded.from;
      const newTo = !loaded || forceReplace ? needTo : needTo > loaded.to ? needTo : loaded.to;

      try {
        const res = await adminFetch(
          `${bookingsEndpoint}?from=${newFrom}&to=${newTo}&limit=200&includeTuro=true`,
          { signal }
        );
        if (res.ok) {
          const data = await res.json();
          setBookings((data.data || []).filter((b: AdminBookingRow) => b.status !== "cancelled"));
          bookingsRangeRef.current = { from: newFrom, to: newTo };
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        logger.error("Failed to fetch bookings:", error);
      }
    },
    [bookingsEndpoint, visibleBounds]
  );

  const fetchAuxiliaryData = useCallback(async () => {
    const needFrom = addDaysToYmd(visibleBounds.from, -120);
    const needTo = addDaysToYmd(visibleBounds.to, 120);
    const blockedUrl = `/api/admin/blocked-dates?from=${encodeURIComponent(needFrom)}&to=${encodeURIComponent(needTo)}`;
    try {
      const blockedRes = await adminFetch(blockedUrl);
      if (blockedRes.ok) {
        const data = await blockedRes.json();
        const rows = (data.data || []) as BlockedDateEntry[];
        setBlockedDates(rows.filter((bd) => bd.source !== "turo-email"));
      }
    } catch (error) {
      logger.error("Failed to fetch blocked dates:", error);
    }
  }, [visibleBounds]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const firstPaint = !calendarAuxLoadedRef.current;
      if (firstPaint) setLoading(true);
      try {
        await loadBookings();
        if (!calendarAuxLoadedRef.current) {
          await fetchAuxiliaryData();
          calendarAuxLoadedRef.current = true;
        }
      } catch (error) {
        logger.error("Failed to fetch calendar data:", error);
      } finally {
        if (firstPaint && !cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
      bookingsAbortControllerRef.current?.abort();
    };
  }, [loadBookings, fetchAuxiliaryData]);

  useEffect(() => {
    if (!calendarAuxLoadedRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        await fetchAuxiliaryData();
      } catch (e) {
        if (!cancelled) logger.error("Failed to refresh blocked dates:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visibleBounds, fetchAuxiliaryData]);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      await loadBookings({ forceReplace: true });
      await fetchAuxiliaryData();
    } catch (error) {
      logger.error("Failed to refresh calendar data:", error);
    } finally {
      setLoading(false);
    }
  }, [loadBookings, fetchAuxiliaryData]);

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
