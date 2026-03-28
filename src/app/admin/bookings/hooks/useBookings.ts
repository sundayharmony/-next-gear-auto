"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { useAutoToast } from "@/lib/hooks/useAutoToast";
import { logger } from "@/lib/utils/logger";
import type { BookingRow, Vehicle, CustomerOption, SortField, SortOrder } from "../types";

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
  updateStatus: (bookingId: string, newStatus: string) => Promise<void>;
  bulkUpdateStatus: (ids: Set<string>, newStatus: string) => Promise<number>;
  updating: string | null;
  todayPickups: BookingRow[];
  todayReturns: BookingRow[];
  overdueBookings: BookingRow[];
}

export function useBookings(): UseBookingsReturn {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allCustomers, setAllCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const { error, setError, success, setSuccess } = useAutoToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("pickup_date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [updating, setUpdating] = useState<string | null>(null);

  // Track abort controller for fetch cancellation
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const fetchBookings = useCallback(async () => {
    // Abort previous request if it's still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this fetch
    abortControllerRef.current = new AbortController();
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      params.set("sort", sortField);
      params.set("order", sortOrder);

      const url = `/api/bookings${params.toString() ? `?${params}` : ""}`;
      const res = await adminFetch(url, { signal: abortControllerRef.current?.signal });
      if (!res.ok) throw new Error(`Failed to fetch bookings: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        let results = data.data || [];
        // Hide cancelled unless specifically filtering for them
        if (statusFilter === "all") {
          results = results.filter((b: BookingRow) => b.status !== "cancelled");
        }
        // Client-side vehicle filter
        if (vehicleFilter && vehicleFilter !== "all") {
          results = results.filter((b: BookingRow) => b.vehicleName === vehicleFilter);
        }
        setBookings(results);
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === "AbortError") return;
      logger.error("Failed to fetch bookings:", err);
    }
    setLoading(false);
  }, [statusFilter, vehicleFilter, searchQuery, sortField, sortOrder]);

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/vehicles");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      if (data.success) setVehicles(data.data || []);
    } catch (err) {
      logger.error("Failed to fetch vehicles:", err);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/customers");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      if (data.success) {
        setAllCustomers(
          (data.data || []).map((c: { id: string; name: string; email: string; phone?: string }) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone || "",
          }))
        );
      }
    } catch (err) {
      logger.error("Failed to fetch customers:", err);
    }
  }, []);

  // Fetch bookings when filters change
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Fetch vehicles and customers once on mount
  useEffect(() => {
    fetchVehicles();
    fetchCustomers();
  }, [fetchVehicles, fetchCustomers]);

  const setSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortOrder("desc");
      return field;
    });
  }, []);

  const updateStatus = useCallback(async (bookingId: string, newStatus: string) => {
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
        if (newStatus === "cancelled") {
          setBookings((prev) => prev.filter((b) => b.id !== bookingId));
        } else {
          setBookings((prev) =>
            prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
          );
        }
        setSuccess(`Booking ${newStatus} successfully!`);
      } else {
        setError(data.message || `Failed to update booking to "${newStatus}"`);
      }
    } catch {
      setError("Network error — could not update booking status");
    } finally {
      setUpdating(null);
    }
  }, [setSuccess, setError]);

  const bulkUpdateStatus = useCallback(async (ids: Set<string>, newStatus: string): Promise<number> => {
    const promises = Array.from(ids).map((id) =>
      adminFetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id, status: newStatus }),
      }).then(async (res) => {
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const data = await res.json();
        return { id, success: data.success };
      }).catch(() => ({ id, success: false }))
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
      fetchBookings();
    }
    return successCount;
  }, [fetchBookings, setError, setSuccess]);

  // Computed: today's pickups, returns, overdue
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const todayPickups = useMemo(
    () => bookings.filter((b) => b.pickup_date === today && ["confirmed"].includes(b.status)),
    [bookings, today]
  );

  const todayReturns = useMemo(
    () => bookings.filter((b) => b.return_date === today && ["active"].includes(b.status)),
    [bookings, today]
  );

  const overdueBookings = useMemo(
    () => bookings.filter((b) => b.is_overdue),
    [bookings]
  );

  return {
    bookings, vehicles, allCustomers, loading,
    error, success, setError, setSuccess,
    statusFilter, setStatusFilter,
    vehicleFilter, setVehicleFilter,
    searchQuery, setSearchQuery,
    sortField, sortOrder, setSort,
    fetchBookings, updateStatus, bulkUpdateStatus, updating,
    todayPickups, todayReturns, overdueBookings,
  };
}
