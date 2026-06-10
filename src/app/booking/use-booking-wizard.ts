"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useBooking } from "@/lib/context/booking-context";
import { useVehicles } from "@/lib/hooks/useVehicles";
import { useAuth } from "@/lib/context/auth-context";
import { useFleetBookedDates } from "@/lib/hooks/use-fleet-booked-dates";
import { getCheckoutTotal } from "@/lib/booking/checkout-total";
import {
  canProceedForStep,
  getStep1ValidationError,
  isVehicleBookedForSelection,
  type CustomerDetailsState,
  type SearchDatesState,
  type WizardStep,
} from "@/lib/booking/wizard-validation";
import { AGREEMENT_SIGNATURE_FIELDS } from "@/data/agreement-fields";
import extras from "@/data/extras.json";
import { logger } from "@/lib/utils/logger";
import type { BookingExtra, Vehicle } from "@/lib/types";
import type { BookingLocation } from "@/app/booking/booking-constants";

export function useBookingWizard() {
  const booking = useBooking();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);

  const [localExtras, setLocalExtras] = useState<BookingExtra[]>(() => {
    if (booking.extras && booking.extras.length > 0) {
      return booking.extras;
    }
    return extras.map((e) => ({
      ...e,
      selected: e.id === "e1" ? true : false,
      billingType: e.billingType as BookingExtra["billingType"],
    }));
  });

  const [insuranceProofFile, setInsuranceProofFile] = useState<File | null>(null);
  const [insuranceProofUrl, setInsuranceProofUrl] = useState<string | null>(null);
  const [uploadingInsuranceProof, setUploadingInsuranceProof] = useState(false);
  const [insuranceUploadError, setInsuranceUploadError] = useState("");
  const [showInsuranceWarning, setShowInsuranceWarning] = useState(false);

  const { vehicles: hookVehicles, loading: hookLoading, error: hookError, retry: retryVehicles } = useVehicles();
  const vehicleIds = useMemo(() => hookVehicles.map((v) => v.id), [hookVehicles]);
  const datesReady = Boolean(booking.pickupDate && booking.returnDate);
  const {
    bookedByVehicle: vehicleBookedDates,
    loading: checkingAvailability,
    error: availabilityError,
    retry: retryAvailability,
  } = useFleetBookedDates(vehicleIds, datesReady && hookVehicles.length > 0);

  useEffect(() => {
    setVehicles(hookVehicles);
    setVehiclesLoading(hookLoading);
    setVehiclesError(hookError);
  }, [hookVehicles, hookLoading, hookError]);

  const [preSelected, setPreSelected] = useState(false);
  const urlVehicleId = searchParams.get("vehicleId");
  const urlVehicleUnavailable =
    Boolean(urlVehicleId) &&
    !vehiclesLoading &&
    vehicles.length > 0 &&
    !vehicles.find((v) => v.id === urlVehicleId);

  useEffect(() => {
    if (preSelected || vehiclesLoading) return;
    const vehicleId = searchParams.get("vehicleId");
    if (vehicleId && !booking.selectedVehicle) {
      const vehicle = vehicles.find((v) => v.id === vehicleId);
      if (vehicle) {
        booking.selectVehicle(vehicle);
        setPreSelected(true);
      }
    }
  }, [searchParams, booking.selectedVehicle, preSelected, vehicles, vehiclesLoading, booking]);

  const [locations, setLocationsData] = useState<BookingLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [selectedPickupLocation, setSelectedPickupLocation] = useState("");
  const [selectedReturnLocation, setSelectedReturnLocation] = useState("");
  const [differentDropoff, setDifferentDropoff] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchLocations() {
      try {
        const res = await fetch("/api/locations");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success && !cancelled) {
          setLocationsData(data.data);
          const defaultLoc = data.data.find((l: BookingLocation) => l.is_default);
          if (defaultLoc) {
            setSelectedPickupLocation(defaultLoc.id);
            setSelectedReturnLocation(defaultLoc.id);
          }
        } else if (!cancelled) {
          logger.error("Failed to fetch locations:", data.error);
        }
      } catch (err) {
        if (!cancelled) logger.error("Location fetch error:", err);
      }
      if (!cancelled) setLocationsLoading(false);
    }
    fetchLocations();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (booking.pickupLocationId) setSelectedPickupLocation(booking.pickupLocationId);
    if (booking.returnLocationId) {
      setSelectedReturnLocation(booking.returnLocationId);
      if (booking.returnLocationId !== booking.pickupLocationId) {
        setDifferentDropoff(true);
      }
    }
  }, [booking.pickupLocationId, booking.returnLocationId]);

  const [details, setDetails] = useState<CustomerDetailsState>(() => {
    if (booking.customerDetails) return booking.customerDetails;
    return { name: "", email: "", phone: "", dob: "" };
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      setDetails((prev) => ({
        name: prev.name || user.name || "",
        email: prev.email || user.email || "",
        phone: prev.phone || user.phone || "",
        dob: prev.dob || user.dob || "",
      }));
    }
  }, [isAuthenticated, user]);

  const [signedName, setSignedName] = useState("");
  const [agreementSignatures, setAgreementSignatures] = useState<Record<string, string | null>>({});
  const agreementFieldIds = useMemo(() => AGREEMENT_SIGNATURE_FIELDS.map((f) => f.id), []);

  const [searchDates, setSearchDates] = useState<SearchDatesState>(() => {
    if (booking.pickupDate && booking.returnDate) {
      return {
        pickup: booking.pickupDate,
        return: booking.returnDate,
        pickupTime: booking.pickupTime || "10:00",
        returnTime: booking.returnTime || "10:00",
      };
    }
    return { pickup: "", return: "", pickupTime: "10:00", returnTime: "10:00" };
  });

  const [showPickupCalendar, setShowPickupCalendar] = useState(false);
  const [showReturnCalendar, setShowReturnCalendar] = useState(false);
  const [showPickupTimePicker, setShowPickupTimePicker] = useState(false);
  const [showReturnTimePicker, setShowReturnTimePicker] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [showDobCalendar, setShowDobCalendar] = useState(false);
  const [dobViewDate, setDobViewDate] = useState(
    new Date(new Date().getFullYear() - 25, new Date().getMonth(), 1)
  );
  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [idDocumentUrl, setIdDocumentUrl] = useState<string | null>(booking.idDocumentUrl);
  const [idRequiredError, setIdRequiredError] = useState("");
  const [uploadingId, setUploadingId] = useState(false);
  const [dateValidationError, setDateValidationError] = useState("");

  useEffect(() => {
    if (booking.idDocumentUrl) setIdDocumentUrl(booking.idDocumentUrl);
  }, [booking.idDocumentUrl]);

  useEffect(() => {
    if (booking.selectedVehicle && booking.pickupDate && booking.returnDate) {
      booking.setExtras(localExtras);
      booking.recalculatePrice();
    }
  }, [
    localExtras,
    booking.selectedVehicle,
    booking.pickupDate,
    booking.returnDate,
    booking.pickupTime,
    booking.returnTime,
    booking.setExtras,
    booking.recalculatePrice,
  ]);

  const currentStepRef = useRef(booking.currentStep);
  useEffect(() => {
    currentStepRef.current = booking.currentStep;
  }, [booking.currentStep]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentStepRef.current > 1 && currentStepRef.current < 7) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    const anyOverlayOpen =
      showPickupCalendar ||
      showReturnCalendar ||
      showPickupTimePicker ||
      showReturnTimePicker ||
      showDobCalendar ||
      showInsuranceWarning;
    if (anyOverlayOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [
    showPickupCalendar,
    showReturnCalendar,
    showPickupTimePicker,
    showReturnTimePicker,
    showDobCalendar,
    showInsuranceWarning,
  ]);

  const isVehicleBooked = useCallback(
    (vehicleId: string) =>
      isVehicleBookedForSelection(
        vehicleId,
        vehicleBookedDates,
        booking.pickupDate,
        booking.returnDate,
        booking.pickupTime,
        booking.returnTime,
      ),
    [
      vehicleBookedDates,
      booking.pickupDate,
      booking.returnDate,
      booking.pickupTime,
      booking.returnTime,
    ],
  );

  const checkoutTotal = getCheckoutTotal(booking.pricing, booking.locationSurcharge);

  const canProceed = useCallback(
    () =>
      canProceedForStep({
        step: booking.currentStep as WizardStep,
        searchDates,
        locationsCount: locations.length,
        selectedPickupLocation,
        selectedVehicle: booking.selectedVehicle,
        checkingAvailability,
        availabilityError,
        vehicleBookedDates,
        pickupDate: booking.pickupDate,
        returnDate: booking.returnDate,
        pickupTime: booking.pickupTime,
        returnTime: booking.returnTime,
        localExtras,
        insuranceProofUrl,
        details,
        idDocumentUrl,
        uploadingId,
        agreementSignatures,
        signedName,
        agreementFieldIds,
      }),
    [
      booking.currentStep,
      searchDates,
      locations.length,
      selectedPickupLocation,
      booking.selectedVehicle,
      checkingAvailability,
      availabilityError,
      vehicleBookedDates,
      booking.pickupDate,
      booking.returnDate,
      booking.pickupTime,
      booking.returnTime,
      localExtras,
      insuranceProofUrl,
      details,
      idDocumentUrl,
      uploadingId,
      agreementSignatures,
      signedName,
      agreementFieldIds,
    ],
  );

  const handleToggleExtra = (id: string) => {
    if (id === "e1") {
      const currentExtra = localExtras.find((e) => e.id === "e1");
      if (currentExtra?.selected && !insuranceProofUrl) {
        setShowInsuranceWarning(true);
        return;
      }
    }
    setLocalExtras((prev) => prev.map((e) => (e.id === id ? { ...e, selected: !e.selected } : e)));
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError("");
    const result = await booking.applyPromoCode(promoInput.trim().toUpperCase());
    if (!result.success) setPromoError(result.error || "Invalid promo code");
    setPromoLoading(false);
  };

  const handleRemovePromo = () => {
    booking.clearPromoCode();
    setPromoInput("");
    setPromoError("");
  };

  const handleNext = () => {
    if (!canProceed()) {
      if (booking.currentStep === 1) {
        setDateValidationError(
          getStep1ValidationError({
            searchDates,
            locationsCount: locations.length,
            selectedPickupLocation,
          }) ?? "",
        );
      }
      if (booking.currentStep === 5) {
        setIdRequiredError("Please upload a photo of your ID to continue");
      }
      return;
    }

    if (booking.currentStep === 1) {
      setDateValidationError("");
      booking.setDates(searchDates.pickup, searchDates.return, searchDates.pickupTime, searchDates.returnTime);
      const pickupLoc = locations.find((l) => l.id === selectedPickupLocation);
      const returnLoc = differentDropoff
        ? locations.find((l) => l.id === selectedReturnLocation)
        : pickupLoc;
      const totalSurcharge =
        (pickupLoc?.surcharge || 0) + (differentDropoff && returnLoc ? returnLoc.surcharge || 0 : 0);
      booking.setLocations(
        selectedPickupLocation || null,
        differentDropoff ? selectedReturnLocation : selectedPickupLocation || null,
        pickupLoc?.name || null,
        (differentDropoff ? returnLoc?.name : pickupLoc?.name) || null,
        totalSurcharge,
      );
    }
    if (booking.currentStep === 4) booking.setCustomerDetails(details);
    if (booking.currentStep === 3) {
      booking.setExtras(localExtras);
      booking.recalculatePrice();
      const insuranceExtra = localExtras.find((e) => e.id === "e1");
      const insuranceOptedOut = !insuranceExtra?.selected && !insuranceProofUrl;
      booking.setInsuranceProof(insuranceProofUrl, insuranceOptedOut);
    }
    if (booking.currentStep === 5) booking.setIdDocumentUrl(idDocumentUrl);
    if (booking.currentStep === 6) {
      booking.setSignedName(signedName);
      booking.setAgreementSignatures(agreementSignatures);
    }
    booking.nextStep();
  };

  const handleStepClick = (step: WizardStep) => booking.setStep(step);

  return {
    booking,
    currentStep: booking.currentStep as WizardStep,
    checkoutTotal,
    canProceed,
    handleNext,
    handleStepClick,
    handleToggleExtra,
    handleApplyPromo,
    handleRemovePromo,
    vehicles,
    vehiclesLoading,
    vehiclesError,
    retryVehicles,
    checkingAvailability,
    availabilityError,
    retryAvailability,
    urlVehicleUnavailable,
    isVehicleBooked,
    localExtras,
    setLocalExtras,
    insuranceProofFile,
    setInsuranceProofFile,
    insuranceProofUrl,
    setInsuranceProofUrl,
    uploadingInsuranceProof,
    setUploadingInsuranceProof,
    insuranceUploadError,
    setInsuranceUploadError,
    showInsuranceWarning,
    setShowInsuranceWarning,
    locations,
    locationsLoading,
    selectedPickupLocation,
    setSelectedPickupLocation,
    selectedReturnLocation,
    setSelectedReturnLocation,
    differentDropoff,
    setDifferentDropoff,
    details,
    setDetails,
    signedName,
    setSignedName,
    agreementSignatures,
    setAgreementSignatures,
    searchDates,
    setSearchDates,
    showPickupCalendar,
    setShowPickupCalendar,
    showReturnCalendar,
    setShowReturnCalendar,
    showPickupTimePicker,
    setShowPickupTimePicker,
    showReturnTimePicker,
    setShowReturnTimePicker,
    calendarViewDate,
    setCalendarViewDate,
    showDobCalendar,
    setShowDobCalendar,
    dobViewDate,
    setDobViewDate,
    promoInput,
    setPromoInput,
    promoLoading,
    promoError,
    setPromoError,
    uploadedFile,
    setUploadedFile,
    uploadError,
    setUploadError,
    idDocumentUrl,
    setIdDocumentUrl,
    idRequiredError,
    setIdRequiredError,
    uploadingId,
    setUploadingId,
    dateValidationError,
  };
}

export type BookingWizardState = ReturnType<typeof useBookingWizard>;
