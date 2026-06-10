"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { useAutoToast } from "@/lib/hooks/useAutoToast";
import { staffKeys, useStaffQuery } from "@/lib/hooks/use-staff-query";
import { logger } from "@/lib/utils/logger";
import { getDisplayReturnDate } from "@/lib/utils/recurring-booking";
import type { BookingRow, Vehicle, CustomerOption, SortField, SortOrder } from "../types";
import type { BookingsPageConfig } from "../config";

interface CustomerApiRow {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface UseBookingsReturn {
  bookings: BookingRow[];
  vehicles: Vehicle[];
  allCustomers: CustomerOption[];
  loading: boolean;
  error: string | null;
  success: string | null;
  setError: (msg: string | null) => void;
  setSuccess: (msg: string | null) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  vehicleFilter: string;
  setVehicleFilter: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortField: SortField;
  sortOrder: SortOrder;
  setSort: (field: SortField) => void;
  fetchBookings: () => Promise<void>;
  /** Merge fields into the in-memory list row so detail-panel sync does not revert optimistic updates */
  mergeBookingInList: (updated: BookingRow) => void;
  updateStatus: (bookingId: string, newStatus: string) => Promise<boolean>;
  bulkUpdateStatus: (ids: Set<string>, newStatus: string) => Promise<number>;
  updating: string | null;
  todayPickups: BookingRow[];
  todayReturns: BookingRow[];
  overdueBookings: BookingRow[];
  paymentDueBookings: BookingRow[];
}

export function useBookings(config: BookingsPageConfig): UseBookingsReturn {
  const queryClient = useQueryClient();
  const { error, setError, success, setSuccess } = useAutoToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("pickup_date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [updating, setUpdating] = useState<string | null>(null);

  const bookingFilters = useMemo(
    () => ({
      endpoint: config.bookingsEndpoint,
      status: statusFilter,
      search: searchQuery.trim(),
      sort: sortField,
      order: sortOrder,
      mode: config.mode,
    }),
    [config.bookingsEndpoint, config.mode, statusFilter, searchQuery, sortField, sortOrder]
  );

  const bookingsUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    params.set("sort", sortField);
    params.set("order", sortOrder);
    params.set("includeTuro", "true");
    return `${config.bookingsEndpoint}${params.toString() ? `?${params}` : ""}`;
  }, [config.bookingsEndpoint, statusFilter, searchQuery, sortField, sortOrder]);

  const bookingsQuery = useStaffQuery<BookingRow[]>(
    staffKeys.bookings(bookingFilters),
    bookingsUrl,
    {
      queryFn: async () => {
        const res = await adminFetch(bookingsUrl);
        if (!res.ok) throw new Error(`Failed to fetch bookings: ${res.status}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message || "Failed to fetch bookings");
        let results: BookingRow[] = data.data || [];
        if (statusFilter === "all" && config.mode === "admin") {
          results = results.filter((b) => b.status !== "cancelled");
        }
        return results;
      },
      placeholderData: (prev) => prev,
    }
  );

  const bookings = useMemo(() => {
    let results = bookingsQuery.data ?? [];
    if (vehicleFilter && vehicleFilter !== "all") {
      results = results.filter((b) => b.vehicleName === vehicleFilter);
    }
    return results;
  }, [bookingsQuery.data, vehicleFilter]);

  const vehiclesQuery = useStaffQuery<Vehicle[]>(
    staffKeys.vehicles(config.vehiclesEndpoint),
    config.vehiclesEndpoint,
    { staleTime: 60_000 }
  );
  const vehicles = vehiclesQuery.data ?? [];

  const customersQuery = useStaffQuery<CustomerApiRow[]>(
    staffKeys.customers(),
    config.customersEndpoint,
    { staleTime: 60_000 }
  );

  const allCustomers = useMemo(
    () =>
      (customersQuery.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone || "",
      })),
    [customersQuery.data]
  );

  const loading = bookingsQuery.isFetching;

  useEffect(() => {
    if (bookingsQuery.error) {
      setError(bookingsQuery.error.message);
    }
  }, [bookingsQuery.error, setError]);

  useEffect(() => {
    if (customersQuery.error) {
      setError(customersQuery.error.message);
    }
  }, [customersQuery.error, setError]);

  useEffect(() => {
    if (vehiclesQuery.error) {
      setError(vehiclesQuery.error.message);
    }
  }, [vehiclesQuery.error, setError]);

  const fetchBookings = useCallback(async () => {
    await bookingsQuery.refetch();
  }, [bookingsQuery]);

  const mergeBookingInList = useCallback(
    (updated: BookingRow) => {
      queryClient.setQueryData<BookingRow[]>(staffKeys.bookings(bookingFilters), (prev) => {
        if (!prev) return prev;
        const i = prev.findIndex((b) => b.id === updated.id);
        if (i === -1) return prev;
        const next = [...prev];
        next[i] = { ...prev[i], ...updated };
        return next;
      });
    },
    [queryClient, bookingFilters]
  );

  const setSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortOrder("desc");
      }
    },
    [sortField]
  );

  const updateStatus = useCallback(
    async (bookingId: string, newStatus: string): Promise<boolean> => {
      if (bookingId.startsWith("turo:")) {
        setError("Turo trips cannot be updated from the bookings list.");
        return false;
      }
      const booking = bookings.find((b) => b.id === bookingId);
      if (config.mode === "manager" && booking && booking.canManage === false) {
        setError("You can only manage bookings you created.");
        return false;
      }

      setUpdating(bookingId);
      try {
        const res = await adminFetch("/api/bookings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId, status: newStatus }),
        });
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const data = await res.json();
        if (data.success) {
          queryClient.setQueryData<BookingRow[]>(staffKeys.bookings(bookingFilters), (prev) => {
            if (!prev) return prev;
            if (newStatus === "cancelled") {
              return prev.filter((b) => b.id !== bookingId);
            }
            return prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b));
          });
          setSuccess(`Booking ${newStatus} successfully!`);
          return true;
        }
        setError(data.message || `Failed to update booking to "${newStatus}"`);
        return false;
      } catch {
        setError("Network error — could not update booking status");
        return false;
      } finally {
        setUpdating(null);
      }
    },
    [bookings, bookingFilters, config.mode, queryClient, setSuccess, setError]
  );

  const bulkUpdateStatus = useCallback(
    async (ids: Set<string>, newStatus: string): Promise<number> => {
      const targetIds =
        config.mode === "manager"
          ? Array.from(ids).filter((id) => {
              if (id.startsWith("turo:")) return false;
              const booking = bookings.find((b) => b.id === id);
              return booking?.canManage !== false;
            })
          : Array.from(ids).filter((id) => !id.startsWith("turo:"));

      if (targetIds.length === 0) {
        setError("No selectable bookings can be updated.");
        return 0;
      }

      const promises = targetIds.map((id) =>
        adminFetch("/api/bookings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: id, status: newStatus }),
        })
          .then(async (res) => {
            if (!res.ok) throw new Error(`Failed: ${res.status}`);
            const data = await res.json();
            return { id, success: data.success };
          })
          .catch(() => ({ id, success: false }))
      );

      const results = await Promise.allSettled(promises);
      let successCount = 0;
      const failedIds: string[] = [];

      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value.success) {
          successCount++;
        } else if (result.status === "fulfilled") {
          failedIds.push(result.value.id);
        } else {
          failedIds.push("unknown");
        }
      });

      if (failedIds.length > 0) {
        setError(`Failed to update ${failedIds.length} booking${failedIds.length > 1 ? "s" : ""}`);
      }
      if (successCount > 0) {
        setSuccess(`${successCount} booking${successCount > 1 ? "s" : ""} updated to ${newStatus}`);
        void queryClient.invalidateQueries({ queryKey: staffKeys.bookings() });
      }
      return successCount;
    },
    [bookings, config.mode, queryClient, setError, setSuccess]
  );

  const isWebsiteBooking = (b: BookingRow) =>
    b.occupancy_kind !== "turo" && !b.id.startsWith("turo:");

  const todayPickups = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return bookings.filter(
      (b) => isWebsiteBooking(b) && b.pickup_date === todayStr && ["confirmed"].includes(b.status)
    );
  }, [bookings]);

  const todayReturns = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return bookings.filter((b) => {
      if (!isWebsiteBooking(b) || !["active"].includes(b.status)) return false;
      const returnDate = getDisplayReturnDate(
        b.return_date,
        b.admin_notes,
        b.effective_return_date
      );
      return returnDate === todayStr;
    });
  }, [bookings]);

  const overdueBookings = useMemo(
    () => bookings.filter((b) => isWebsiteBooking(b) && b.is_overdue),
    [bookings]
  );

  const paymentDueBookings = useMemo(
    () => bookings.filter((b) => isWebsiteBooking(b) && b.is_payment_overdue),
    [bookings]
  );

  return {
    bookings,
    vehicles,
    allCustomers,
    loading,
    error,
    success,
    setError,
    setSuccess,
    statusFilter,
    setStatusFilter,
    vehicleFilter,
    setVehicleFilter,
    searchQuery,
    setSearchQuery,
    sortField,
    sortOrder,
    setSort,
    fetchBookings,
    mergeBookingInList,
    updateStatus,
    bulkUpdateStatus,
    updating,
    todayPickups,
    todayReturns,
    overdueBookings,
    paymentDueBookings,
  };
}
