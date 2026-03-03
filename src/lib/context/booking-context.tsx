"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
import type { Vehicle, BookingExtra, BookingStep, PricingBreakdown } from "@/lib/types";
import { calculatePricing, calculateRentalDays, applyDiscount, type PromoDiscount } from "@/lib/utils/price-calculator";

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
  signedName: string;
  promoCode: string | null;
  promoDiscount: PromoDiscount | null;
  isSubmitting: boolean;
  bookingId: string | null;
  error: string | null;
}

type BookingAction =
  | { type: "SET_DATES"; payload: { pickupDate: string; returnDate: string } }
  | { type: "SELECT_VEHICLE"; payload: Vehicle }
  | { type: "SET_EXTRAS"; payload: BookingExtra[] }
  | { type: "TOGGLE_EXTRA"; payload: string }
  | { type: "SET_CUSTOMER_DETAILS"; payload: BookingState["customerDetails"] }
  | { type: "SET_SIGNED_NAME"; payload: string }
  | { type: "SET_STEP"; payload: BookingStep }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "CALCULATE_PRICING" }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS"; payload: string }
  | { type: "SUBMIT_ERROR"; payload: string }
  | { type: "SET_PROMO"; payload: { code: string; discount: PromoDiscount } }
  | { type: "CLEAR_PROMO" }
  | { type: "RESET" };

const initialState: BookingState = {
  currentStep: 1,
  pickupDate: "",
  returnDate: "",
  selectedVehicle: null,
  extras: [],
  pricing: null,
  customerDetails: { name: "", email: "", phone: "", dob: "" },
  signedName: "",
  promoCode: null,
  promoDiscount: null,
  isSubmitting: false,
  bookingId: null,
  error: null,
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
    case "SET_SIGNED_NAME":
      return { ...state, signedName: action.payload };
    case "SET_STEP":
      return { ...state, currentStep: action.payload };
    case "NEXT_STEP":
      return { ...state, currentStep: Math.min(state.currentStep + 1, 7) as BookingStep };
    case "PREV_STEP":
      return { ...state, currentStep: Math.max(state.currentStep - 1, 1) as BookingStep };
    case "CALCULATE_PRICING": {
      if (!state.selectedVehicle || !state.pickupDate || !state.returnDate) return state;
      const days = calculateRentalDays(state.pickupDate, state.returnDate);
      let pricing: PricingBreakdown & { discount?: PromoDiscount } = calculatePricing(
        days,
        state.selectedVehicle.dailyRate,
        state.extras
      );
      // Apply promo discount if set
      if (state.promoDiscount) {
        pricing = applyDiscount(pricing, state.promoDiscount);
      }
      return { ...state, pricing };
    }
    case "SET_PROMO":
      return { ...state, promoCode: action.payload.code, promoDiscount: action.payload.discount };
    case "CLEAR_PROMO":
      return { ...state, promoCode: null, promoDiscount: null };
    case "SUBMIT_START":
      return { ...state, isSubmitting: true, error: null };
    case "SUBMIT_SUCCESS":
      return { ...state, isSubmitting: false, bookingId: action.payload };
    case "SUBMIT_ERROR":
      return { ...state, isSubmitting: false, error: action.payload };
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
  setSignedName: (name: string) => void;
  setStep: (step: BookingStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  recalculatePrice: () => void;
  applyPromoCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  clearPromoCode: () => void;
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

  const setSignedName = useCallback((name: string) => {
    dispatch({ type: "SET_SIGNED_NAME", payload: name });
  }, []);

  const setStep = useCallback((step: BookingStep) => {
    dispatch({ type: "SET_STEP", payload: step });
  }, []);

  const nextStep = useCallback(() => dispatch({ type: "NEXT_STEP" }), []);
  const prevStep = useCallback(() => dispatch({ type: "PREV_STEP" }), []);
  const recalculatePrice = useCallback(() => dispatch({ type: "CALCULATE_PRICING" }), []);

  const applyPromoCode = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, bookingAmount: state.pricing?.subtotal || 0 }),
      });
      const data = await res.json();
      if (data.success) {
        dispatch({ type: "SET_PROMO", payload: { code: data.data.code, discount: data.data } });
        // Recalculate pricing with discount applied
        setTimeout(() => dispatch({ type: "CALCULATE_PRICING" }), 0);
        return { success: true };
      }
      return { success: false, error: data.error || "Invalid promo code" };
    } catch {
      return { success: false, error: "Failed to validate promo code" };
    }
  }, [state.pricing?.subtotal]);

  const clearPromoCode = useCallback(() => {
    dispatch({ type: "CLEAR_PROMO" });
    setTimeout(() => dispatch({ type: "CALCULATE_PRICING" }), 0);
  }, []);

  const submitBooking = useCallback(async () => {
    dispatch({ type: "SUBMIT_START" });
    try {
      // Call our checkout API which creates booking in Supabase + Stripe Checkout session
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: state.selectedVehicle?.id,
          vehicleName: state.selectedVehicle ? `${state.selectedVehicle.year} ${state.selectedVehicle.make} ${state.selectedVehicle.model}` : "",
          pickupDate: state.pickupDate,
          returnDate: state.returnDate,
          extras: state.extras.filter((e) => e.selected),
          customerDetails: state.customerDetails,
          totalPrice: state.pricing?.total || 0,
          deposit: state.pricing?.deposit || 0,
          signedName: state.signedName,
          promoCode: state.promoCode || undefined,
          discountAmount: state.promoDiscount?.discountAmount || 0,
        }),
      });

      const data = await res.json();

      if (data.success && data.data?.sessionUrl) {
        // Redirect to Stripe Checkout hosted page
        dispatch({ type: "SUBMIT_SUCCESS", payload: data.data.bookingId });
        window.location.href = data.data.sessionUrl;
      } else {
        dispatch({
          type: "SUBMIT_ERROR",
          payload: data.message || "Checkout failed. Please try again.",
        });
      }
    } catch {
      dispatch({
        type: "SUBMIT_ERROR",
        payload: "An error occurred. Please try again.",
      });
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
        setSignedName,
        setStep,
        nextStep,
        prevStep,
        recalculatePrice,
        applyPromoCode,
        clearPromoCode,
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
