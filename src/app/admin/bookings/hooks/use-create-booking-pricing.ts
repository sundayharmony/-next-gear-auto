"use client";

import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from "react";
import { calculatePricing, calculateRentalHours } from "@/lib/utils/price-calculator";
import { AVAILABLE_EXTRAS, type Vehicle } from "../types";

export interface CreateBookingPricingForm {
  vehicleId: string;
  pickupDate: string;
  returnDate: string;
  pickupTime: string;
  returnTime: string;
  selectedExtras: string[];
  totalPrice: number;
}

interface UseCreateBookingPricingOptions<T extends CreateBookingPricingForm> {
  form: T;
  setForm: Dispatch<SetStateAction<T>>;
  vehicles: Vehicle[];
  onError: (msg: string) => void;
}

export function useCreateBookingPricing<T extends CreateBookingPricingForm>({
  form,
  setForm,
  vehicles,
  onError,
}: UseCreateBookingPricingOptions<T>) {
  const [manualPriceOverride, setManualPriceOverride] = useState(false);

  const calculateHours = useCallback(() => {
    if (!form.pickupDate || !form.returnDate) return 0;
    try {
      return calculateRentalHours(form.pickupDate, form.returnDate, form.pickupTime, form.returnTime);
    } catch {
      return 0;
    }
  }, [form.pickupDate, form.returnDate, form.pickupTime, form.returnTime]);

  const restoreAutoPrice = useCallback(() => {
    setManualPriceOverride(false);
    const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId);
    if (!selectedVehicle || !form.pickupDate || !form.returnDate) {
      setForm((prev) => ({ ...prev, totalPrice: 0 }));
      onError("Select vehicle, pickup, and return date to recalculate price.");
      return;
    }
    const hours = calculateHours();
    if (!hours) {
      setForm((prev) => ({ ...prev, totalPrice: 0 }));
      onError("Set return date/time after pickup date/time to recalculate price.");
      return;
    }
    const mappedExtras = AVAILABLE_EXTRAS.map((extra) => ({
      ...extra,
      selected: form.selectedExtras.includes(extra.id),
    }));
    const total = calculatePricing(hours, selectedVehicle.dailyRate ?? 0, mappedExtras).total;
    setForm((prev) => ({ ...prev, totalPrice: total }));
  }, [calculateHours, form.pickupDate, form.returnDate, form.selectedExtras, form.vehicleId, onError, setForm, vehicles]);

  useEffect(() => {
    if (manualPriceOverride) return;

    const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId);
    if (!selectedVehicle || !form.pickupDate || !form.returnDate) {
      setForm((prev) => ({ ...prev, totalPrice: 0 }));
      return;
    }

    const hours = calculateHours();
    if (!hours) {
      setForm((prev) => ({ ...prev, totalPrice: 0 }));
      return;
    }
    const mappedExtras = AVAILABLE_EXTRAS.map((extra) => ({
      ...extra,
      selected: form.selectedExtras.includes(extra.id),
    }));
    const total = calculatePricing(hours, selectedVehicle.dailyRate ?? 0, mappedExtras).total;

    setForm((prev) => ({ ...prev, totalPrice: total }));
  }, [
    form.vehicleId,
    form.pickupDate,
    form.returnDate,
    form.pickupTime,
    form.returnTime,
    form.selectedExtras,
    vehicles,
    manualPriceOverride,
    calculateHours,
    setForm,
  ]);

  return {
    manualPriceOverride,
    setManualPriceOverride,
    calculateHours,
    restoreAutoPrice,
  };
}
