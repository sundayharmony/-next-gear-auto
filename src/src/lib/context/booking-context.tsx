"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
import type { Vehicle, BookingExtra, BookingStep, PricingBreakdown } from "@/lib/types";
import { calculatePricing, calculateRentalDays } from "@/lib/utils/price-calculator";

interface BookingState {
  currentStep: BookingStep;
  pickupDate: string;
  returnDate: string;
  selectedVehicle: Vehicle | null;
  extras: BookingExtra[];
  pricing: PricingBreakdown | null;
  customerDetails: {
    name: string;
    email: string;
    phone: string;
    dob: string;
  };
  isSubmitting: boolean;
  bookingId: string | null;
}

type BookingAction =
  | { type: "SET_DATES"; payload: { pickupDate: string; returnDate: string } }
  | { type: "SELECT_VEHICLE"; payload: Vehicle }
  | { type: "SET_EXTRAS"; payload: BookingExtra[] }
  | { type: "TOGGLE_EXTRA"; payload: string }
  | { type: "SET_CUSTOMER_DETAILS"; payload: BookingState["customerDetails"] }
  | { type: "SET_STEP"; payload: BookingStep }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "CALCULATE_PRICING" }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS"; payload: string }
  | { type: "RESET" };

const initialState: BookingState = {
  currentStep: 1,
  pickupDate: "",
  returnDate: "",
  selectedVehicle: null,
  extras: [],
  pricing: null,
  customerDetails: { name: "", email: "", phone: "", dob: "" },
  isSubmitting: false,
  bookingId: null,
};

function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case "SET_DATES":
      return { ...state, pickupDate: action.payload.pickupDate, returnDate: action.payload.returnDate };
    case "SELECT_VEHICLE":
      return { ...state, selectedVehicle: action.payload };
    case "SET_EXTRAS":
      return { ...state, extras: action.payload };
    case "TOGGLE_EXTRA":
      return {
        ...state,
        extras: state.extras.map((e) =>
          e.id === action.payload ? { ...e, selected: !e.selected } : e
        ),
      };
    case "SET_CUSTOMER_DETAILS":
      return { ...state, customerDetails: action.payload };
    case "SET_STEP":
      return { ...state, currentStep: action.payload };
    case "NEXT_STEP":
      return { ...state, currentStep: Math.min(state.currentStep + 1, 7) as BookingStep };
    case "PREV_STEP":
      return { ...state, currentStep: Math.max(state.currentStep - 1, 1) as BookingStep };
    case "CALCULATE_PRICING": {
      if (!state.selectedVehicle || !state.pickupDate || !state.returnDate) return state;
      const days = calculateRentalDays(state.pickupDate, state.returnDate);
      const pricing = calculatePricing(
        days,
        state.selectedVehicle.dailyRate,
        state.selectedVehicle.weeklyRate,
        state.selectedVehicle.monthlyRate,
        state.extras
      );
      return { ...state, pricing };
    }
    case "SUBMIT_START":
      return { ...state, isSubmitting: true };
    case "SUBMIT_SUCCESS":
      return { ...state, isSubmitting: false, bookingId: action.payload };
    case "RESET":
      return { ...initialState };
    default:
      return state;
  }
}

interface BookingContextType extends BookingState {
  setDates: (pickupDate: string, returnDate: string) => void;
  selectVehicle: (vehicle: Vehicle) => void;
  setExtras: (extras: BookingExtra[]) => void;
  toggleExtra: (extraId: string) => void;
  setCustomerDetails: (details: BookingState["customerDetails"]) => void;
  setStep: (step: BookingStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  recalculatePrice: () => void;
  submitBooking: () => Promise<void>;
  resetBooking: () => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(bookingReducer, initialState);

  const setDates = useCallback((pickupDate: string, returnDate: string) => {
    dispatch({ type: "SET_DATES", payload: { pickupDate, returnDate } });
  }, []);

  const selectVehicle = useCallback((vehicle: Vehicle) => {
    dispatch({ type: "SELECT_VEHICLE", payload: vehicle });
  }, []);

  const setExtras = useCallback((extras: BookingExtra[]) => {
    dispatch({ type: "SET_EXTRAS", payload: extras });
  }, []);

  const toggleExtra = useCallback((extraId: string) => {
    dispatch({ type: "TOGGLE_EXTRA", payload: extraId });
  }, []);

  const setCustomerDetails = useCallback((details: BookingState["customerDetails"]) => {
    dispatch({ type: "SET_CUSTOMER_DETAILS", payload: details });
  }, []);

  const setStep = useCallback((step: BookingStep) => {
    dispatch({ type: "SET_STEP", payload: step });
  }, []);

  const nextStep = useCallback(() => dispatch({ type: "NEXT_STEP" }), []);
  const prevStep = useCallback(() => dispatch({ type: "PREV_STEP" }), []);
  const recalculatePrice = useCallback(() => dispatch({ type: "CALCULATE_PRICING" }), []);

  const submitBooking = useCallback(async () => {
    dispatch({ type: "SUBMIT_START" });
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: state.selectedVehicle?.id,
          pickupDate: state.pickupDate,
          returnDate: state.returnDate,
          extras: state.extras.filter((e) => e.selected),
          customerDetails: state.customerDetails,
          totalPrice: state.pricing?.total,
        }),
      });
      const data = await res.json();
      if (data.success) {
        dispatch({ type: "SUBMIT_SUCCESS", payload: data.data.id });
      }
    } catch {
      // handle error
    }
  }, [state]);

  const resetBooking = useCallback(() => dispatch({ type: "RESET" }), []);

  return (
    <BookingContext.Provider
      value={{
        ...state,
        setDates,
        selectVehicle,
        setExtras,
        toggleExtra,
        setCustomerDetails,
        setStep,
        nextStep,
        prevStep,
        recalculatePrice,
        submitBooking,
        resetBooking,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) throw new Error("useBooking must be used within a BookingProvider");
  return context;
}
