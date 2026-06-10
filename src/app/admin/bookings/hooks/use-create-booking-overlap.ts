"use client";

import { useState, useEffect, useRef } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { isYyyyMmDd, isoDateOrderingOk } from "@/lib/utils/booking-dates";
import { logger } from "@/lib/utils/logger";

export interface CreateBookingOverlapForm {
  vehicleId: string;
  pickupDate: string;
  returnDate: string;
  pickupTime: string;
  returnTime: string;
}

export function useCreateBookingOverlap(form: CreateBookingOverlapForm) {
  const [hasOverlappingBookings, setHasOverlappingBookings] = useState(false);
  const overlapAbortControllerRef = useRef<AbortController | null>(null);

  const hasValidOverlapInput = () => {
    if (!form.vehicleId || !form.pickupDate || !form.returnDate) return false;
    if (!isYyyyMmDd(form.pickupDate) || !isYyyyMmDd(form.returnDate)) return false;
    if (!isoDateOrderingOk(form.pickupDate, form.returnDate)) return false;
    if (form.pickupDate === form.returnDate && form.returnTime <= form.pickupTime) return false;
    return true;
  };

  useEffect(() => {
    const checkOverlap = async () => {
      if (!hasValidOverlapInput()) {
        setHasOverlappingBookings(false);
        return;
      }

      if (overlapAbortControllerRef.current) {
        overlapAbortControllerRef.current.abort();
      }

      overlapAbortControllerRef.current = new AbortController();

      try {
        const pt = encodeURIComponent(form.pickupTime || "00:00");
        const rt = encodeURIComponent(form.returnTime || "23:59");
        const res = await adminFetch(
          `/api/bookings/check-overlap?vehicleId=${encodeURIComponent(form.vehicleId)}&pickupDate=${encodeURIComponent(form.pickupDate)}&returnDate=${encodeURIComponent(form.returnDate)}&pickupTime=${pt}&returnTime=${rt}`,
          { method: "GET", signal: overlapAbortControllerRef.current.signal }
        );
        if (!res.ok) {
          if (res.status === 400) {
            setHasOverlappingBookings(false);
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setHasOverlappingBookings(data.hasOverlap || false);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        logger.error("Failed to check booking overlap:", err);
        setHasOverlappingBookings(false);
      }
    };

    const timer = setTimeout(() => {
      checkOverlap();
    }, 400);

    return () => {
      clearTimeout(timer);
      if (overlapAbortControllerRef.current) {
        overlapAbortControllerRef.current.abort();
      }
    };
  }, [form.vehicleId, form.pickupDate, form.returnDate, form.pickupTime, form.returnTime]);

  return { hasOverlappingBookings };
}
