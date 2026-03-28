"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search, Car, Package, UserCheck, ShieldCheck, FileText, CreditCard,
  Calendar, ArrowLeft, ArrowRight, Check, Users, Briefcase, Fuel, ChevronRight, Tag, X, Upload,
  Shield, CheckCircle, PenLine, CheckCircle2, Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { useBooking } from "@/lib/context/booking-context";
import { useVehicles } from "@/lib/hooks/useVehicles";
import { SignaturePad } from "@/components/signature-pad";
import { RentalAgreementInline, getPageForStep } from "@/components/rental-agreement-inline";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatTime } from "@/lib/utils/date-helpers";
import { csrfFetch } from "@/lib/utils/csrf-fetch";
import { useAuth } from "@/lib/context/auth-context";
import { logger } from "@/lib/utils/logger";
import extras from "@/data/extras.json";
import type { BookingExtra, Vehicle } from "@/lib/types";
import { AGREEMENT_SIGNATURE_FIELDS } from "@/data/agreement-fields";

const STEPS = [
  { num: 1, label: "Search", icon: Search },
  { num: 2, label: "Vehicle", icon: Car },
  { num: 3, label: "Extras", icon: Package },
  { num: 4, label: "Details", icon: UserCheck },
  { num: 5, label: "Verify", icon: ShieldCheck },
  { num: 6, label: "Review", icon: FileText },
  { num: 7, label: "Payment", icon: CreditCard },
];

// Helper function to convert 24-hour time to 12-hour display format
const formatTime24To12 = formatTime;

// Generate time options from 8:00 AM to 6:00 PM in 30-minute intervals
const generateTimeOptions = () => {
  const options = [];
  for (let hour = 8; hour <= 18; hour++) {
    for (let minute of [0, 30]) {
      const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      options.push({ value: timeStr, display: formatTime24To12(timeStr) });
    }
  }
  return options;
};

const timeOptions = generateTimeOptions();

function BookingPageInner() {
  const booking = useBooking();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);
  const [localExtras, setLocalExtras] = useState<BookingExtra[]>(
    extras.map((e) => ({ ...e, selected: e.id === "e1" ? true : false, billingType: e.billingType as BookingExtra["billingType"] }))
  );

  // Insurance proof state
  const [insuranceProofFile, setInsuranceProofFile] = useState<File | null>(null);
  const [insuranceProofUrl, setInsuranceProofUrl] = useState<string | null>(null);
  const [uploadingInsuranceProof, setUploadingInsuranceProof] = useState(false);
  const [insuranceUploadError, setInsuranceUploadError] = useState("");
  const [showInsuranceWarning, setShowInsuranceWarning] = useState(false);

  // Booked dates for vehicle availability
  interface BookedRange {
    id: string;
    pickupDate: string;
    returnDate: string;
    pickupTime: string;
    returnTime: string;
    status: string;
  }
  const [vehicleBookedDates, setVehicleBookedDates] = useState<Record<string, BookedRange[]>>({});
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Fetch vehicles from API
  const { vehicles: hookVehicles, loading: hookLoading, error: hookError } = useVehicles();

  // Sync hook state to component state
  useEffect(() => {
    setVehicles(hookVehicles);
    setVehiclesLoading(hookLoading);
    setVehiclesError(hookError);
  }, [hookVehicles, hookLoading, hookError]);

  // Pre-select vehicle from URL query param (e.g. /booking?vehicleId=v1)
  const [preSelected, setPreSelected] = useState(false);
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
  }, [searchParams, booking.selectedVehicle, preSelected, vehicles, vehiclesLoading]);

  // Fetch booked dates for all vehicles when dates are set (Step 1 → Step 2 transition)
  useEffect(() => {
    if (!booking.pickupDate || !booking.returnDate) return;
    if (vehicles.length === 0) return;

    let cancelled = false;
    const controller = new AbortController();

    const fetchAllBookedDates = async () => {
      setCheckingAvailability(true);
      const dateMap: Record<string, BookedRange[]> = {};
      try {
        await Promise.all(
          vehicles.map(async (v) => {
            try {
              const res = await fetch(`/api/vehicles/booked-dates?vehicleId=${v.id}`, { signal: controller.signal });
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const data = await res.json();
              if (data.success) {
                dateMap[v.id] = data.data || [];
              }
            } catch (err) {
              if ((err as Error).name !== "AbortError") {
                dateMap[v.id] = [];
              }
            }
          })
        );
      } catch {
        // If fetching fails, don't block anything
      }
      if (!cancelled) {
        setVehicleBookedDates(dateMap);
        setCheckingAvailability(false);
      }
    };

    fetchAllBookedDates();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [booking.pickupDate, booking.returnDate, vehicles]);

  // Check if a vehicle has a date conflict with selected dates (includes 12-hour buffer)
  const isVehicleBooked = (vehicleId: string): boolean => {
    const ranges = vehicleBookedDates[vehicleId];
    if (!ranges || ranges.length === 0) return false;
    if (!booking.pickupDate || !booking.returnDate) return false;

    const BUFFER_MS = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

    // Convert selected dates + times to timestamps
    const selectedPickup = new Date(`${booking.pickupDate}T${booking.pickupTime || "10:00"}:00`).getTime();
    const selectedReturn = new Date(`${booking.returnDate}T${booking.returnTime || "10:00"}:00`).getTime();

    for (const range of ranges) {
      // Convert existing booking dates + times to timestamps
      const existingPickup = new Date(`${range.pickupDate}T${range.pickupTime || "10:00"}:00`).getTime();
      const existingReturn = new Date(`${range.returnDate}T${range.returnTime || "10:00"}:00`).getTime();

      // Add 12-hour buffer: existing booking blocks from (pickup - 12h) to (return + 12h)
      const bufferedStart = existingPickup - BUFFER_MS;
      const bufferedEnd = existingReturn + BUFFER_MS;

      // Check overlap: selected range overlaps with buffered existing range
      if (selectedPickup < bufferedEnd && selectedReturn > bufferedStart) {
        return true;
      }
    }
    return false;
  };

  // Customer details local state
  const [details, setDetails] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
  });

  // Auto-populate details from signed-in user
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
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  // PDF agreement signature state
  const [agreementSignatures, setAgreementSignatures] = useState<Record<string, string | null>>({});
  const [agreementStep, setAgreementStep] = useState(0);

  const handleAgreementSignatureChange = useCallback(
    (fieldId: string, dataUrl: string | null) => {
      setAgreementSignatures((prev) => ({ ...prev, [fieldId]: dataUrl }));
    },
    []
  );

  const agreementCompletedCount = AGREEMENT_SIGNATURE_FIELDS.filter((f) => agreementSignatures[f.id]).length;
  const allAgreementsSigned = agreementCompletedCount === AGREEMENT_SIGNATURE_FIELDS.length;
  const currentAgreementField = AGREEMENT_SIGNATURE_FIELDS[agreementStep];
  const [searchDates, setSearchDates] = useState({ pickup: "", return: "", pickupTime: "10:00", returnTime: "10:00" });
  const [showPickupCalendar, setShowPickupCalendar] = useState(false);
  const [showReturnCalendar, setShowReturnCalendar] = useState(false);
  const [showPickupTimePicker, setShowPickupTimePicker] = useState(false);
  const [showReturnTimePicker, setShowReturnTimePicker] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [showDobCalendar, setShowDobCalendar] = useState(false);
  const [dobViewDate, setDobViewDate] = useState(new Date(new Date().getFullYear() - 25, new Date().getMonth(), 1));
  const [showFullAgreement, setShowFullAgreement] = useState(false);
  const [fullAgreementPage, setFullAgreementPage] = useState(1);
  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [idDocumentUrl, setIdDocumentUrl] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const insuranceSectionRef = useRef<HTMLDivElement>(null);

  // Recalculate pricing when vehicle or extras change
  useEffect(() => {
    if (booking.selectedVehicle && booking.pickupDate && booking.returnDate) {
      booking.setExtras(localExtras);
      booking.recalculatePrice();
    }
  }, [localExtras, booking.selectedVehicle]);

  const handleToggleExtra = (id: string) => {
    if (id === "e1") {
      // Insurance - check if trying to deselect
      const currentExtra = localExtras.find(e => e.id === "e1");
      if (currentExtra?.selected && !insuranceProofUrl) {
        setShowInsuranceWarning(true);
        return;
      }
    }
    // Normal toggle for other extras
    setLocalExtras((prev) =>
      prev.map((e) => (e.id === id ? { ...e, selected: !e.selected } : e))
    );
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError("");
    const result = await booking.applyPromoCode(promoInput.trim().toUpperCase());
    if (!result.success) {
      setPromoError(result.error || "Invalid promo code");
    }
    setPromoLoading(false);
  };

  const handleFileUpload = async (file: File) => {
    setUploadError("");
    if (!file || !file.name) {
      setUploadError("No file selected.");
      return;
    }
    if (file.size <= 0) {
      setUploadError("File appears to be empty.");
      return;
    }
    const validTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Please upload a JPG, PNG, or PDF file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File must be under 5MB.");
      return;
    }
    setUploadedFile(file);
    setUploadingId(true);

    // Upload to Supabase storage immediately
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await csrfFetch("/api/upload-temp", { method: "POST", body: formData });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setIdDocumentUrl(data.url);
      } else {
        setUploadError("Upload failed: " + (data.error || "Unknown error"));
        setUploadedFile(null);
      }
    } catch (err) {
      logger.error("ID upload error:", err);
      setUploadError("Failed to upload ID document");
      setUploadedFile(null);
    }
    setUploadingId(false);
  };

  const handleRemovePromo = () => {
    booking.clearPromoCode();
    setPromoInput("");
    setPromoError("");
  };

  const availableVehicles = vehicles.filter((v) => v.isAvailable && !isVehicleBooked(v.id));

  const canProceed = (): boolean => {
    switch (booking.currentStep) {
      case 1: {
        if (!searchDates.pickup || !searchDates.return || !searchDates.pickupTime || !searchDates.returnTime) {
          return false;
        }
        const pickupDate = new Date(searchDates.pickup);
        const returnDate = new Date(searchDates.return);
        if (returnDate <= pickupDate) {
          return false;
        }
        // If same day, validate return time > pickup time
        if (searchDates.pickup === searchDates.return) {
          return searchDates.returnTime > searchDates.pickupTime;
        }
        return true;
      }
      case 2: return !!booking.selectedVehicle;
      case 3: {
        // Insurance (e1) is required: must either be selected (pay for it)
        // or the user must have uploaded proof of their own coverage
        const insuranceExtra = localExtras.find(e => e.id === "e1");
        if (insuranceExtra && !insuranceExtra.selected && !insuranceProofUrl) {
          return false;
        }
        return true;
      }
      case 4: {
        if (!details.name || !details.email || !details.phone || !details.dob) {
          return false;
        }
        // Age validation: must be 18+
        const dob = new Date(details.dob);
        if (isNaN(dob.getTime())) return false;
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        if (age < 18) {
          return false;
        }
        // Email validation: basic format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(details.email)) {
          return false;
        }
        return true;
      }
      case 5: return true; // ID upload optional in prototype
      case 6: return allAgreementsSigned && !!signedName;
      case 7: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (booking.currentStep === 1) {
      booking.setDates(searchDates.pickup, searchDates.return, searchDates.pickupTime, searchDates.returnTime);
    }
    if (booking.currentStep === 4) {
      booking.setCustomerDetails(details);
    }
    if (booking.currentStep === 3) {
      booking.setExtras(localExtras);
      booking.recalculatePrice();
      // Store insurance proof in booking context
      const insuranceOptedOut = insuranceProofUrl !== null;
      booking.setInsuranceProof(insuranceProofUrl, insuranceOptedOut);
    }
    if (booking.currentStep === 5) {
      // Store ID document URL in booking context
      booking.setIdDocumentUrl(idDocumentUrl);
    }
    if (booking.currentStep === 6) {
      booking.setSignedName(signedName);
      // Save agreement signatures to context (will be persisted to localStorage before Stripe redirect)
      booking.setAgreementSignatures(agreementSignatures);
    }
    booking.nextStep();
  };

  // Helper functions for calendar
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  // CalendarOverlay Component
  const CalendarOverlay = ({ isOpen, onClose, onSelectDate, isPickup }: { isOpen: boolean; onClose: () => void; onSelectDate: (date: string) => void; isPickup: boolean }) => {
    if (!isOpen) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const minDate = new Date(today);
    if (!isPickup && searchDates.pickup) {
      const pickupDate = new Date(searchDates.pickup + "T00:00:00");
      minDate.setTime(Math.max(minDate.getTime(), pickupDate.getTime()));
    }

    const daysInMonth = getDaysInMonth(calendarViewDate);
    const firstDay = getFirstDayOfMonth(calendarViewDate);
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), i));
    }

    const monthYear = calendarViewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const handleDayClick = (day: Date) => {
      const dateStr = day.toISOString().split("T")[0];
      onSelectDate(dateStr);
      onClose();
    };

    const previousMonth = () => {
      setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1));
    };

    const nextMonth = () => {
      setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1));
    };

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-xl" onClick={onClose}>
        <div className="bg-white/95 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl max-w-sm w-full mx-4 shadow-2xl p-6 animate-in" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <button onClick={previousMonth} aria-label="Previous month" className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900" aria-live="polite">{monthYear}</h3>
            <button onClick={nextMonth} aria-label="Next month" className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-gray-500 h-11 flex items-center justify-center">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((day, idx) => {
              const isDisabled = day === null || day < minDate;
              const isSelected = day && day.toISOString().split("T")[0] === (isPickup ? searchDates.pickup : searchDates.return);
              return (
                <button
                  key={idx}
                  onClick={() => day && !isDisabled && handleDayClick(day)}
                  disabled={isDisabled}
                  className={cn(
                    "h-11 w-11 rounded-lg font-medium transition flex items-center justify-center text-sm",
                    isDisabled ? "text-gray-300 cursor-not-allowed" : "text-gray-900 hover:bg-gray-100",
                    isSelected ? "bg-purple-600 text-white font-semibold hover:bg-purple-700" : ""
                  )}
                >
                  {day ? day.getDate() : ""}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // TimePickerOverlay Component
  const TimePickerOverlay = ({ isOpen, onClose, onSelectTime, selectedTime }: { isOpen: boolean; onClose: () => void; onSelectTime: (time: string) => void; selectedTime: string }) => {
    if (!isOpen) return null;

    const timeListRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (isOpen && timeListRef.current) {
        const selectedElement = timeListRef.current.querySelector("[data-selected='true']");
        if (selectedElement) {
          selectedElement.scrollIntoView({ behavior: "instant", block: "center" });
        }
      }
    }, [isOpen]);

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-xl" onClick={onClose}>
        <div className="bg-white/95 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl max-w-sm w-full mx-4 shadow-2xl animate-in" onClick={(e) => e.stopPropagation()}>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Time</h3>
          </div>
          <div ref={timeListRef} className="max-h-80 overflow-y-auto">
            {timeOptions.map((opt) => (
              <button
                key={opt.value}
                data-selected={opt.value === selectedTime}
                onClick={() => {
                  onSelectTime(opt.value);
                  onClose();
                }}
                className={cn(
                  "w-full px-6 py-4 text-left font-medium transition border-l-4",
                  opt.value === selectedTime
                    ? "bg-purple-50 border-purple-600 text-purple-700 font-semibold"
                    : "bg-white border-transparent text-gray-900 hover:bg-gray-50"
                )}
              >
                {opt.display}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // BirthdayCalendarOverlay Component — Apple-style DOB picker
  const BirthdayCalendarOverlay = ({ isOpen, onClose, onSelectDate, selectedDate }: { isOpen: boolean; onClose: () => void; onSelectDate: (date: string) => void; selectedDate: string }) => {
    if (!isOpen) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()); // Must be 18+

    const daysInMonth = getDaysInMonth(dobViewDate);
    const firstDay = getFirstDayOfMonth(dobViewDate);
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(dobViewDate.getFullYear(), dobViewDate.getMonth(), i));
    }

    const monthYear = dobViewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const handleDayClick = (day: Date) => {
      const dateStr = day.toISOString().split("T")[0];
      onSelectDate(dateStr);
      onClose();
    };

    const previousMonth = () => {
      setDobViewDate(new Date(dobViewDate.getFullYear(), dobViewDate.getMonth() - 1));
    };
    const nextMonth = () => {
      const next = new Date(dobViewDate.getFullYear(), dobViewDate.getMonth() + 1);
      if (next <= maxDate) setDobViewDate(next);
    };
    const previousYear = () => {
      setDobViewDate(new Date(dobViewDate.getFullYear() - 1, dobViewDate.getMonth()));
    };
    const nextYear = () => {
      const next = new Date(dobViewDate.getFullYear() + 1, dobViewDate.getMonth());
      if (next <= maxDate) setDobViewDate(next);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-xl" onClick={onClose}>
        <div className="bg-white/95 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl max-w-sm w-full mx-4 shadow-2xl p-6 animate-in" onClick={(e) => e.stopPropagation()}>
          {/* Year navigation */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <button onClick={previousYear} className="px-2 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition">
              ‹‹ Year
            </button>
            <span className="text-sm font-bold text-gray-900 min-w-[3rem] text-center">{dobViewDate.getFullYear()}</span>
            <button
              onClick={nextYear}
              disabled={new Date(dobViewDate.getFullYear() + 1, dobViewDate.getMonth()) > maxDate}
              className="px-2 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Year ››
            </button>
          </div>

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={previousMonth} aria-label="Previous month" className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900">{monthYear}</h3>
            <button
              onClick={nextMonth}
              disabled={new Date(dobViewDate.getFullYear(), dobViewDate.getMonth() + 1) > maxDate}
              aria-label="Next month"
              className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-gray-500 h-11 flex items-center justify-center">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((day, idx) => {
              const isFuture = day !== null && day > maxDate;
              const isDisabled = day === null || isFuture;
              const isSelected = day && day.toISOString().split("T")[0] === selectedDate;
              return (
                <button
                  key={idx}
                  onClick={() => day && !isDisabled && handleDayClick(day)}
                  disabled={isDisabled}
                  className={cn(
                    "h-11 w-11 rounded-lg font-medium transition flex items-center justify-center text-sm",
                    isDisabled ? "text-gray-300 cursor-not-allowed" : "text-gray-900 hover:bg-gray-100",
                    isSelected ? "bg-purple-600 text-white font-semibold hover:bg-purple-700" : ""
                  )}
                >
                  {day ? day.getDate() : ""}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 text-center mt-4">Must be 18 years or older</p>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Header */}
      <section className="bg-gradient-to-br from-purple-900 to-gray-900 py-8 text-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Book Your Vehicle</h1>
          <p className="mt-1 text-purple-200">Complete the steps below to reserve your rental.</p>
        </div>
      </section>

      {/* Progress Steps */}
      <div className="border-b border-gray-200 bg-white sticky top-[64px] z-30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 overflow-x-auto py-3">
            {STEPS.map((step, i) => (
              <React.Fragment key={step.num}>
                {i > 0 && <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />}
                <button
                  onClick={() => step.num < booking.currentStep && booking.setStep(step.num as 1|2|3|4|5|6|7)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                    booking.currentStep === step.num
                      ? "bg-purple-600 text-white"
                      : step.num < booking.currentStep
                      ? "bg-purple-100 text-purple-700 cursor-pointer hover:bg-purple-200"
                      : "bg-gray-100 text-gray-400"
                  )}
                  disabled={step.num > booking.currentStep}
                  aria-current={booking.currentStep === step.num ? "step" : undefined}
                >
                  {step.num < booking.currentStep ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <step.icon className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Live Price Summary — visible from step 2 onward when vehicle is selected */}
      {booking.currentStep >= 2 && booking.selectedVehicle && booking.pickupDate && booking.returnDate && (
        <div className="border-b border-purple-100 bg-purple-50/60">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex flex-wrap items-center gap-3 text-gray-600">
                <span className="font-medium text-gray-900">
                  {booking.selectedVehicle.year} {booking.selectedVehicle.make} {booking.selectedVehicle.model}
                </span>
                <span className="text-gray-400">|</span>
                <span>
                  {(() => {
                    const days = Math.max(
                      Math.ceil(
                        Math.abs(new Date(booking.returnDate).getTime() - new Date(booking.pickupDate).getTime()) /
                          (1000 * 60 * 60 * 24)
                      ),
                      1
                    );
                    return `${days} day${days > 1 ? "s" : ""} x $${booking.selectedVehicle.dailyRate}/day`;
                  })()}
                </span>
                {booking.extras.filter((e) => e.selected).length > 0 && (
                  <>
                    <span className="text-gray-400">+</span>
                    <span>{booking.extras.filter((e) => e.selected).length} extra{booking.extras.filter((e) => e.selected).length > 1 ? "s" : ""}</span>
                  </>
                )}
              </div>
              <div className="text-right">
                {booking.pricing ? (
                  <span className="text-lg font-bold text-purple-700">
                    ${booking.pricing.total.toFixed(2)}
                    <span className="text-xs font-normal text-gray-500 ml-1">total</span>
                  </span>
                ) : (
                  <span className="text-lg font-bold text-purple-700">
                    ${(() => {
                      const days = Math.max(
                        Math.ceil(
                          Math.abs(new Date(booking.returnDate).getTime() - new Date(booking.pickupDate).getTime()) /
                            (1000 * 60 * 60 * 24)
                        ),
                        1
                      );
                      const base = days * booking.selectedVehicle.dailyRate;
                      const tax = base * 0.08;
                      return (base + tax).toFixed(2);
                    })()}
                    <span className="text-xs font-normal text-gray-500 ml-1">est. total</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <PageContainer className="py-8">
        <div className="mx-auto max-w-3xl">
          {/* Step 1: Search */}
          {booking.currentStep === 1 && (
            <>
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Select Your Dates</h2>
                <p className="text-sm text-gray-500 mb-6">Choose when you need the vehicle.</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Pick-up Date</label>
                    <button
                      onClick={() => {
                        setCalendarViewDate(searchDates.pickup ? new Date(searchDates.pickup + "T00:00:00") : new Date());
                        setShowPickupCalendar(true);
                      }}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white text-left hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    >
                      {searchDates.pickup ? formatDateForInput(searchDates.pickup) : "Select date"}
                    </button>
                    <label className="mt-3 mb-1.5 block text-sm font-medium text-gray-700">Pick-up Time</label>
                    <button
                      onClick={() => setShowPickupTimePicker(true)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white text-left hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    >
                      {timeOptions.find((opt) => opt.value === searchDates.pickupTime)?.display || "Select time"}
                    </button>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Return Date</label>
                    <button
                      onClick={() => {
                        setCalendarViewDate(searchDates.return ? new Date(searchDates.return + "T00:00:00") : new Date());
                        setShowReturnCalendar(true);
                      }}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white text-left hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    >
                      {searchDates.return ? formatDateForInput(searchDates.return) : "Select date"}
                    </button>
                    <label className="mt-3 mb-1.5 block text-sm font-medium text-gray-700">Return Time</label>
                    <button
                      onClick={() => setShowReturnTimePicker(true)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white text-left hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    >
                      {timeOptions.find((opt) => opt.value === searchDates.returnTime)?.display || "Select time"}
                    </button>
                  </div>
                </div>
                {searchDates.pickup && searchDates.return && (
                  <div className="mt-4 rounded-lg bg-purple-50 p-3 text-sm text-purple-700">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    {Math.ceil((new Date(searchDates.return).getTime() - new Date(searchDates.pickup).getTime()) / (1000 * 60 * 60 * 24))} day rental
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Calendar Overlays */}
            <CalendarOverlay
              isOpen={showPickupCalendar}
              onClose={() => setShowPickupCalendar(false)}
              onSelectDate={(date) => setSearchDates((p) => ({ ...p, pickup: date }))}
              isPickup={true}
            />
            <CalendarOverlay
              isOpen={showReturnCalendar}
              onClose={() => setShowReturnCalendar(false)}
              onSelectDate={(date) => setSearchDates((p) => ({ ...p, return: date }))}
              isPickup={false}
            />

            {/* Time Picker Overlays */}
            <TimePickerOverlay
              isOpen={showPickupTimePicker}
              onClose={() => setShowPickupTimePicker(false)}
              onSelectTime={(time) => setSearchDates((p) => ({ ...p, pickupTime: time }))}
              selectedTime={searchDates.pickupTime}
            />
            <TimePickerOverlay
              isOpen={showReturnTimePicker}
              onClose={() => setShowReturnTimePicker(false)}
              onSelectTime={(time) => setSearchDates((p) => ({ ...p, returnTime: time }))}
              selectedTime={searchDates.returnTime}
            />
            </>
          )}

          {/* Step 2: Select Vehicle */}
          {booking.currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Choose Your Vehicle</h2>
              <p className="text-sm text-gray-500">Select from our available fleet for your dates.</p>
              {vehiclesError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                  {vehiclesError}
                </div>
              )}
              {checkingAvailability && (
                <div className="rounded-lg bg-purple-50 p-3 text-sm text-purple-600 flex items-center gap-2">
                  <span className="animate-spin inline-block h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full" />
                  Checking vehicle availability...
                </div>
              )}
              <div className="grid grid-cols-1 gap-4">
                {vehicles.filter((v) => v.isAvailable).map((vehicle) => {
                  const booked = isVehicleBooked(vehicle.id);
                  return (
                    <Card
                      key={vehicle.id}
                      className={cn(
                        "transition-all",
                        booked
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer hover:shadow-md",
                        !booked && booking.selectedVehicle?.id === vehicle.id && "ring-2 ring-purple-600 shadow-md"
                      )}
                      onClick={() => !booked && booking.selectVehicle(vehicle)}
                    >
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-lg bg-gray-100 overflow-hidden">
                          {vehicle.images && vehicle.images.length > 0 ? (
                            <img src={vehicle.images[0]} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} loading="lazy" className="h-full w-full object-cover" />
                          ) : (
                            <Car className="h-10 w-10 text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={cn("font-semibold", booked ? "text-gray-400" : "text-gray-900")}>{vehicle.year} {vehicle.make} {vehicle.model}</h3>
                            <Badge variant="secondary">{vehicle.category}</Badge>
                            {booked && (
                              <Badge className="bg-red-100 text-red-600 text-xs">Booked for these dates</Badge>
                            )}
                          </div>
                          <div className="mt-1 flex gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {vehicle.specs.passengers}</span>
                            <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {vehicle.specs.luggage}</span>
                            <span className="flex items-center gap-1"><Fuel className="h-3 w-3" /> {vehicle.specs.mpg} mpg</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={cn("text-xl font-bold", booked ? "text-gray-400" : "text-purple-600")}>${vehicle.dailyRate}</div>
                          <div className="text-xs text-gray-400">/day</div>
                        </div>
                        {!booked && booking.selectedVehicle?.id === vehicle.id && (
                          <Check className="h-5 w-5 shrink-0 text-purple-600" />
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Extras */}
          {booking.currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Add-On Extras</h2>
              <p className="text-sm text-gray-500">Enhance your rental with optional extras.</p>
              <div className="grid grid-cols-1 gap-3">
                {localExtras.map((extra) => (
                  <React.Fragment key={extra.id}>
                    <Card
                      className={cn(
                        "cursor-pointer transition-all",
                        extra.selected ? "ring-2 ring-purple-600 bg-purple-50" : "hover:shadow-sm"
                      )}
                      onClick={() => handleToggleExtra(extra.id)}
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex h-5 w-5 items-center justify-center rounded border-2 transition-colors",
                            extra.selected ? "border-purple-600 bg-purple-600" : "border-gray-300"
                          )}>
                            {extra.selected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900">{extra.name}</h3>
                              {extra.id === "e1" && (
                                <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                                  Required
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{extra.description}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <div className="font-semibold text-gray-900">${extra.pricePerDay}/day</div>
                          {extra.maxPrice && <div className="text-xs text-gray-400">max ${extra.maxPrice}</div>}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Insurance Proof Upload Section */}
                    {extra.id === "e1" && (
                      <div ref={insuranceSectionRef} className="mt-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Have your own insurance coverage?
                        </p>
                        <p className="text-xs text-gray-500 mb-3">
                          Upload proof of valid auto insurance to waive the $11.25/day coverage fee.
                        </p>
                        {insuranceProofUrl ? (
                          <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 p-3">
                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-green-700">Insurance proof uploaded</p>
                              <p className="text-xs text-green-600">Coverage charge has been removed</p>
                            </div>
                            <button
                              onClick={() => {
                                setInsuranceProofUrl(null);
                                setInsuranceProofFile(null);
                                // Re-select insurance
                                setLocalExtras((prev) =>
                                  prev.map((e) => (e.id === "e1" ? { ...e, selected: true } : e))
                                );
                              }}
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-purple-300 bg-white px-4 py-3 cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors">
                            <Upload className="h-4 w-4 text-purple-500" />
                            <span className="text-sm text-purple-600 font-medium">
                              {uploadingInsuranceProof ? "Uploading..." : "Upload Insurance Proof"}
                            </span>
                            <input
                              type="file"
                              className="hidden"
                              accept=".jpg,.jpeg,.png,.pdf,.webp"
                              disabled={uploadingInsuranceProof}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                // Validate
                                const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
                                if (!validTypes.includes(file.type)) {
                                  setInsuranceUploadError("Please upload a JPG, PNG, WebP, or PDF file.");
                                  return;
                                }
                                if (file.size > 5 * 1024 * 1024) {
                                  setInsuranceUploadError("File must be under 5MB.");
                                  return;
                                }
                                setInsuranceUploadError("");

                                setInsuranceProofFile(file);
                                setUploadingInsuranceProof(true);

                                try {
                                  const formData = new FormData();
                                  formData.append("file", file);
                                  const uploadRes = await csrfFetch("/api/upload-temp", { method: "POST", body: formData });
                                  if (!uploadRes.ok) throw new Error(`HTTP ${uploadRes.status}`);
                                  const uploadData = await uploadRes.json();
                                  if (uploadData.success) {
                                    setInsuranceProofUrl(uploadData.url);
                                  } else {
                                    setInsuranceUploadError("Failed to upload insurance proof: " + (uploadData.error || "Unknown error"));
                                    setUploadingInsuranceProof(false);
                                    return;
                                  }
                                } catch (err) {
                                  logger.error("Insurance upload error:", err);
                                  setInsuranceUploadError("Failed to upload insurance proof. Please try again.");
                                  setUploadingInsuranceProof(false);
                                  return;
                                }

                                // Auto-deselect insurance
                                setLocalExtras((prev) =>
                                  prev.map((e) => (e.id === "e1" ? { ...e, selected: false } : e))
                                );
                                setUploadingInsuranceProof(false);
                              }}
                            />
                          </label>
                        )}
                        {insuranceUploadError && (
                          <p className="mt-1 text-xs text-red-600">{insuranceUploadError}</p>
                        )}
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Your Details */}
          {booking.currentStep === 4 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Your Details</h2>
                <p className="text-sm text-gray-500 mb-6">Tell us about yourself.</p>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Full Name</label>
                    <Input placeholder="John Doe" value={details.name} onChange={(e) => setDetails((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
                      <Input type="email" placeholder="you@example.com" value={details.email} onChange={(e) => setDetails((p) => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone</label>
                      <Input type="tel" placeholder="(555) 123-4567" value={details.phone} onChange={(e) => setDetails((p) => ({ ...p, phone: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Date of Birth</label>
                    <button
                      type="button"
                      onClick={() => {
                        if (details.dob) {
                          const d = new Date(details.dob + "T00:00:00");
                          setDobViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
                        }
                        setShowDobCalendar(true);
                      }}
                      className="w-full flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-sm hover:border-purple-300 hover:bg-purple-50/30 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-purple-500" />
                        <span className={details.dob ? "text-gray-900 font-medium" : "text-gray-400"}>
                          {details.dob
                            ? new Date(details.dob + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                            : "Select your birthday"}
                        </span>
                      </div>
                      <Maximize2 className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                    <p className="mt-1 text-xs text-gray-400">You must be at least 18 years old to rent.</p>
                    <BirthdayCalendarOverlay
                      isOpen={showDobCalendar}
                      onClose={() => setShowDobCalendar(false)}
                      onSelectDate={(date) => setDetails((p) => ({ ...p, dob: date }))}
                      selectedDate={details.dob}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Verification */}
          {booking.currentStep === 5 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">ID Verification</h2>
                <p className="text-sm text-gray-500 mb-6">Upload your driver&apos;s license for verification.</p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />

                {uploadedFile ? (
                  <div className="rounded-xl border-2 border-green-300 bg-green-50 p-6 text-center">
                    <Check className="mx-auto h-10 w-10 text-green-500 mb-3" />
                    <p className="text-sm font-medium text-green-700">
                      {uploadingId ? "Uploading..." : "File uploaded successfully"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(0)} KB)</p>
                    <div className="mt-4 flex justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setUploadedFile(null); setIdDocumentUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Remove
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Replace File
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-purple-400 cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-purple-500", "bg-purple-50"); }}
                    onDragLeave={(e) => { e.currentTarget.classList.remove("border-purple-500", "bg-purple-50"); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-purple-500", "bg-purple-50");
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  >
                    <Upload className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-sm font-medium text-gray-700">Upload Driver&apos;s License</p>
                    <p className="mt-1 text-xs text-gray-400">Drag & drop or click to browse — JPG, PNG, or PDF up to 5MB</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                      Choose File
                    </Button>
                  </div>
                )}

                {uploadError && (
                  <p className="mt-3 text-sm text-red-600">{uploadError}</p>
                )}

                <p className="mt-4 text-xs text-gray-400">Your ID will be verified within 24 hours. You can proceed with your booking now.</p>
              </CardContent>
            </Card>
          )}

          {/* Step 6: Review & Sign */}
          {booking.currentStep === 6 && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Summary</h2>
                  {booking.selectedVehicle && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Vehicle</span>
                        <span className="font-medium text-gray-900">{booking.selectedVehicle.year} {booking.selectedVehicle.make} {booking.selectedVehicle.model}</span>
                      </div>
                      <div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Pick-up</span>
                          <span className="text-lg font-bold text-gray-900">{formatDate(booking.pickupDate)}</span>
                        </div>
                        {booking.pickupTime && (
                          <div className="flex justify-between">
                            <span></span>
                            <span className="text-xl font-bold text-purple-600">{formatTime24To12(booking.pickupTime)}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Return</span>
                          <span className="text-lg font-bold text-gray-900">{formatDate(booking.returnDate)}</span>
                        </div>
                        {booking.returnTime && (
                          <div className="flex justify-between">
                            <span></span>
                            <span className="text-xl font-bold text-purple-600">{formatTime24To12(booking.returnTime)}</span>
                          </div>
                        )}
                      </div>
                      {booking.pricing && (
                        <>
                          <div className="border-t pt-3 space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Base ({booking.pricing.baseDays} day{booking.pricing.baseDays !== 1 ? "s" : ""})</span>
                              <span>${booking.pricing.baseTotal.toFixed(2)}</span>
                            </div>
                            {booking.pricing.multiDayDiscount > 0 && (
                              <div className="flex justify-between text-sm text-green-600">
                                <span>Multi-day discount (7.5%/day)</span>
                                <span>-${booking.pricing.multiDayDiscount.toFixed(2)}</span>
                              </div>
                            )}
                            {booking.pricing.extras.map((e) => (
                              <div key={e.name} className="flex justify-between text-sm">
                                <span className="text-gray-500">{e.name}</span>
                                <span>${e.total.toFixed(2)}</span>
                              </div>
                            ))}
                            {booking.pricing.insuranceDiscount > 0 && (
                              <div className="flex justify-between text-sm text-green-600">
                                <span>Insurance discount (15% off)</span>
                                <span>-${booking.pricing.insuranceDiscount.toFixed(2)}</span>
                              </div>
                            )}
                            {booking.promoDiscount && (
                              <div className="flex justify-between text-sm text-green-600">
                                <span className="flex items-center gap-1">
                                  <Tag className="h-3 w-3" />
                                  Promo: {booking.promoCode}
                                </span>
                                <span>-${booking.promoDiscount.discountAmount.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Tax</span>
                              <span>${booking.pricing.tax.toFixed(2)}</span>
                            </div>
                          </div>
                          {(booking.pricing.multiDayDiscount > 0 || booking.pricing.insuranceDiscount > 0) && (
                            <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-xs text-green-700 mt-2">
                              You&apos;re saving ${(booking.pricing.multiDayDiscount + booking.pricing.insuranceDiscount).toFixed(2)} with multi-day &amp; insurance discounts!
                            </div>
                          )}
                          <div className="border-t pt-3 flex justify-between font-semibold text-lg">
                            <span>Total</span>
                            <span className="text-purple-600">${booking.pricing.total.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-gray-500">
                            <span>Total Due</span>
                            <span className="text-purple-600">${booking.pricing.total.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Promo Code */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-purple-600" />
                    Promo Code
                  </h3>
                  {booking.promoCode ? (
                    <div className="flex items-center justify-between rounded-lg bg-green-50 border border-green-200 p-3">
                      <div>
                        <span className="font-medium text-green-700">{booking.promoCode}</span>
                        <span className="ml-2 text-sm text-green-600">
                          — {booking.promoDiscount?.description || "Discount applied"}
                        </span>
                      </div>
                      <button onClick={handleRemovePromo} aria-label="Remove promo code" className="text-green-600 hover:text-green-800">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter promo code"
                          value={promoInput}
                          onChange={(e) => { setPromoInput(e.target.value); setPromoError(""); }}
                          className="uppercase"
                        />
                        <Button
                          variant="outline"
                          onClick={handleApplyPromo}
                          disabled={promoLoading || !promoInput.trim()}
                        >
                          {promoLoading ? "..." : "Apply"}
                        </Button>
                      </div>
                      {promoError && (
                        <p className="mt-2 text-sm text-red-600">{promoError}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* PDF Rental Agreement */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <PenLine className="h-4 w-4 text-purple-600" />
                    Rental Agreement
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Review the rental agreement, then provide your initials and signature to proceed.
                  </p>

                  {/* Read Agreement Button + Compact Preview */}
                  {booking.selectedVehicle && (
                    <div className="mb-4">
                      <button
                        onClick={() => { setFullAgreementPage(getPageForStep(agreementStep)); setShowFullAgreement(true); }}
                        className="w-full rounded-xl border-2 border-dashed border-purple-200 bg-purple-50/50 p-4 flex items-center justify-between hover:border-purple-400 hover:bg-purple-50 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                            <FileText className="h-5 w-5 text-purple-600" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-semibold text-gray-900">Vehicle Rental Agreement</p>
                            <p className="text-xs text-gray-500">Tap to read full agreement — Page {getPageForStep(agreementStep)} of 3</p>
                          </div>
                        </div>
                        <Maximize2 className="h-5 w-5 text-purple-400 group-hover:text-purple-600 transition-colors" />
                      </button>
                    </div>
                  )}

                  {/* Full-Screen Agreement Reader Overlay */}
                  {showFullAgreement && booking.selectedVehicle && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowFullAgreement(false)}>
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />
                      <div
                        className="relative bg-white/95 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg mx-0 sm:mx-4 shadow-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                          <h3 className="font-bold text-gray-900">Rental Agreement</h3>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400">Page {fullAgreementPage} of 3</span>
                            <button onClick={() => setShowFullAgreement(false)} aria-label="Close agreement" className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                              <X className="h-4 w-4 text-gray-600" />
                            </button>
                          </div>
                        </div>

                        {/* Scrollable Agreement Content */}
                        <div className="flex-1 overflow-y-auto overscroll-contain">
                          <div className="text-[15px] leading-relaxed">
                            <RentalAgreementInline
                              vehicle={booking.selectedVehicle}
                              customerName={details.name}
                              customerEmail={details.email}
                              customerPhone={details.phone}
                              pickupDate={booking.pickupDate}
                              returnDate={booking.returnDate}
                              pickupTime={booking.pickupTime}
                              returnTime={booking.returnTime}
                              totalPrice={booking.pricing?.total || 0}
                              totalDays={booking.pricing ? Math.max(1, Math.ceil((new Date(booking.returnDate + "T00:00:00").getTime() - new Date(booking.pickupDate + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24))) : 1}
                              currentPage={fullAgreementPage}
                            />
                          </div>
                        </div>

                        {/* Page Navigation Footer */}
                        <div className="shrink-0 px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white/80">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setFullAgreementPage((p) => Math.max(1, p - 1))}
                            disabled={fullAgreementPage === 1}
                          >
                            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Previous
                          </Button>
                          <div className="flex gap-1.5">
                            {[1, 2, 3].map((p) => (
                              <button
                                key={p}
                                onClick={() => setFullAgreementPage(p)}
                                className={`h-2.5 w-8 rounded-full transition-colors ${p === fullAgreementPage ? "bg-purple-600" : "bg-gray-200 hover:bg-gray-300"}`}
                              />
                            ))}
                          </div>
                          {fullAgreementPage < 3 ? (
                            <Button
                              size="sm"
                              onClick={() => setFullAgreementPage((p) => p + 1)}
                            >
                              Next <ArrowRight className="h-3.5 w-3.5 ml-1" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => setShowFullAgreement(false)}
                            >
                              Done <Check className="h-3.5 w-3.5 ml-1" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Signature Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Signatures: {agreementCompletedCount} of {AGREEMENT_SIGNATURE_FIELDS.length}
                      </span>
                      <span className="text-xs text-gray-400">
                        Step {agreementStep + 1} of {AGREEMENT_SIGNATURE_FIELDS.length}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {AGREEMENT_SIGNATURE_FIELDS.map((field, i) => (
                        <button
                          key={field.id}
                          onClick={() => setAgreementStep(i)}
                          className={`h-2 flex-1 rounded-full transition-colors ${
                            agreementSignatures[field.id]
                              ? "bg-green-500"
                              : i === agreementStep
                                ? "bg-purple-500"
                                : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Current Signature Field */}
                  <div className="rounded-lg border border-purple-200 bg-purple-50/30 p-4 mb-4">
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        {agreementSignatures[currentAgreementField.id] ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <PenLine className="h-5 w-5 text-purple-500" />
                        )}
                        <h4 className="text-sm font-semibold text-gray-900">
                          {currentAgreementField.label}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-500 ml-7">
                        {currentAgreementField.description}
                      </p>
                    </div>

                    <div className="flex justify-center">
                      <SignaturePad
                        key={currentAgreementField.id}
                        onSignatureChange={(data) =>
                          handleAgreementSignatureChange(currentAgreementField.id, data)
                        }
                        isInitials={currentAgreementField.isInitials}
                        label={currentAgreementField.isInitials ? "Initial here" : "Sign here"}
                        width={currentAgreementField.isInitials ? 200 : 400}
                        height={currentAgreementField.isInitials ? 80 : 150}
                      />
                    </div>

                    {/* Signature Navigation */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-purple-100">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAgreementStep((s) => Math.max(0, s - 1))}
                        disabled={agreementStep === 0}
                      >
                        <ArrowLeft className="h-3 w-3 mr-1" /> Previous
                      </Button>
                      {agreementStep < AGREEMENT_SIGNATURE_FIELDS.length - 1 && (
                        <Button
                          size="sm"
                          onClick={() => setAgreementStep((s) => s + 1)}
                          disabled={!agreementSignatures[currentAgreementField.id]}
                        >
                          Next <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* All Signatures Summary */}
                  <div className="space-y-1.5 mb-4">
                    {AGREEMENT_SIGNATURE_FIELDS.map((field, i) => (
                      <button
                        key={field.id}
                        onClick={() => setAgreementStep(i)}
                        className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors text-sm ${
                          i === agreementStep
                            ? "bg-purple-50 border border-purple-200"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        {agreementSignatures[field.id] ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-300 shrink-0" />
                        )}
                        <span className="text-gray-700 truncate text-xs">{field.label}</span>
                        {agreementSignatures[field.id] && (
                          <span className="ml-auto text-xs text-green-600 shrink-0">Signed</span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Typed Legal Name */}
                  <div className="border-t pt-4">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Type Your Full Legal Name</label>
                    <Input placeholder="Your full legal name" value={signedName} onChange={(e) => setSignedName(e.target.value)} className="font-serif italic text-lg" />
                  </div>

                  {allAgreementsSigned && signedName && (
                    <div className="mt-3 rounded-lg bg-green-50 border border-green-200 p-3 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      <span className="text-sm text-green-700">Agreement fully signed — you may proceed to payment.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 7: Secure Payment via Stripe */}
          {booking.currentStep === 7 && (
            <Card>
              <CardContent className="p-6 text-center">
                <CreditCard className="mx-auto h-12 w-12 text-purple-600 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Secure Payment</h2>
                <p className="text-sm text-gray-500 mb-2">
                  You&apos;ll be redirected to Stripe&apos;s secure checkout to complete your payment.
                </p>
                <p className="text-xs text-gray-400 mb-6">
                  Your card details are handled entirely by Stripe — they never touch our servers.
                </p>

                {booking.error && (
                  <div className="mx-auto max-w-sm rounded-lg bg-red-50 border border-red-200 p-3 mb-4 text-sm text-red-700">
                    {booking.error}
                  </div>
                )}

                <div className="mx-auto max-w-sm space-y-3">
                  {booking.pricing && (
                    <div className="rounded-lg bg-gray-50 p-4 text-left text-sm space-y-2">
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-gray-500">Rental Total</span>
                        <span className="font-semibold">${booking.pricing.total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="font-medium text-gray-700">Amount Due Now</span>
                        <span className="font-bold text-purple-600">${booking.pricing.total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => booking.submitBooking()}
                    disabled={booking.isSubmitting}
                  >
                    {booking.isSubmitting ? (
                      <>
                        <span className="animate-spin mr-2 inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Redirecting to Stripe...
                      </>
                    ) : (
                      "Proceed to Secure Payment"
                    )}
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                    <span>Secured by Stripe</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Insurance Warning Modal */}
          {showInsuranceWarning && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white rounded-xl shadow-xl max-w-sm mx-4 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="h-8 w-8 text-purple-600" />
                  <h3 className="text-lg font-semibold">Insurance Required</h3>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  Insurance coverage is required for all rentals. To opt out, please upload proof of your own valid auto insurance policy.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setShowInsuranceWarning(false)}>
                    Keep Insurance
                  </Button>
                  <Button className="flex-1" onClick={() => {
                    setShowInsuranceWarning(false);
                    // Scroll to insurance section
                    setTimeout(() => {
                      insuranceSectionRef.current?.scrollIntoView({ behavior: "smooth" });
                    }, 100);
                  }}>
                    Upload Proof
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          {booking.currentStep <= 7 && (
            <div className="mt-6 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={booking.currentStep === 1 ? undefined : () => booking.prevStep()}
                disabled={booking.currentStep === 1 || booking.isSubmitting}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              {booking.currentStep < 7 && (
                <Button onClick={handleNext} disabled={!canProceed()}>
                  {booking.currentStep === 6 ? "Proceed to Payment" : "Continue"}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          )}
        </div>
      </PageContainer>
    </>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-400">Loading...</div>}>
      <BookingPageInner />
    </Suspense>
  );
}
