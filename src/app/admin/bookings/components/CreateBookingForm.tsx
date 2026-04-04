"use client";

import { useState, useRef, useEffect } from "react";
import { X, Check, AlertTriangle, Calculator, MapPin, Upload, User, Car, CalendarDays, Package, CreditCard, DollarSign, Clock, Shield, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { logger } from "@/lib/utils/logger";
import {
  Vehicle,
  CustomerOption,
  ExtraItem,
  AVAILABLE_EXTRAS,
  PAYMENT_METHODS,
  TIME_SLOTS,
} from "../types";
import { Location } from "@/lib/types";

/* ── Section header component ── */
function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-purple-100 text-purple-600 shrink-0">
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

interface CreateBookingFormProps {
  vehicles: Vehicle[];
  allCustomers: CustomerOption[];
  onClose: () => void;
  onCreated: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
  prefillData?: {
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
  };
}

const emptyForm = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  vehicleId: "",
  pickupDate: "",
  returnDate: "",
  pickupTime: "10:00",
  returnTime: "10:00",
  totalPrice: 0,
  deposit: 0,
  status: "pending",
  selectedExtras: [] as string[],
  paymentMethod: "stripe",
};

export default function CreateBookingForm({
  vehicles,
  allCustomers,
  onClose,
  onCreated,
  onError,
  onSuccess,
  prefillData,
}: CreateBookingFormProps) {
  const [form, setForm] = useState(emptyForm);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerOption[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [hasOverlappingBookings, setHasOverlappingBookings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualPriceOverride, setManualPriceOverride] = useState(false);
  const [locations, setLocationsState] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [pickupLocationId, setPickupLocationId] = useState("");
  const [returnLocationId, setReturnLocationId] = useState("");
  const [differentDropoff, setDifferentDropoff] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [idDocumentPreview, setIdDocumentPreview] = useState<string | null>(null);
  const idInputRef = useRef<HTMLInputElement>(null);

  // Prefill data if provided
  useEffect(() => {
    if (prefillData) {
      setForm((prev) => ({
        ...prev,
        customerName: prefillData.customerName || "",
        customerEmail: prefillData.customerEmail || "",
        customerPhone: prefillData.customerPhone || "",
      }));
    }
  }, [prefillData]);

  // Click-outside detection for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch locations
  useEffect(() => {
    let cancelled = false;
    adminFetch("/api/admin/locations?active=true")
      .then(r => r.json())
      .then(data => {
        if (data.success && !cancelled) {
          setLocationsState(data.data);
          const def = (data.data || []).find((l: Location) => l.is_default);
          if (def) {
            setPickupLocationId(def.id);
            setReturnLocationId(def.id);
          }
        }
      })
      .catch((err) => console.warn("Failed to load locations:", err))
      .finally(() => {
        if (!cancelled) setLocationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Handle customer search with debounce
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (value.trim()) {
        const filtered = allCustomers.filter(
          (c) =>
            (c.name || "").toLowerCase().includes(value.toLowerCase()) ||
            (c.email || "").toLowerCase().includes(value.toLowerCase())
        );
        setFilteredCustomers(filtered.slice(0, 8));
        setShowDropdown(true);
      } else {
        setFilteredCustomers([]);
        setShowDropdown(false);
      }
    }, 300);
  };

  // Select customer from dropdown
  const selectCustomer = (customer: CustomerOption) => {
    setForm((prev) => ({
      ...prev,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
    }));
    setShowDropdown(false);
    setSearchValue("");
  };

  // Handle ID document file change
  const handleIdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      onError("File too large. Maximum size is 10MB.");
      return;
    }
    setIdDocument(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setIdDocumentPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setIdDocumentPreview(null);
    }
  };

  // Calculate days
  const calculateDays = () => {
    if (!form.pickupDate || !form.returnDate) return 0;
    const pickup = new Date(form.pickupDate + "T00:00:00").getTime();
    const returnDate = new Date(form.returnDate + "T00:00:00").getTime();
    return Math.max(1, Math.ceil((returnDate - pickup) / 86400000));
  };

  // Check for overlapping bookings
  const overlapAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const checkOverlap = async () => {
      if (!form.vehicleId || !form.pickupDate || !form.returnDate) {
        setHasOverlappingBookings(false);
        return;
      }

      // Abort previous request if it's still pending
      if (overlapAbortControllerRef.current) {
        overlapAbortControllerRef.current.abort();
      }

      // Create new abort controller for this fetch
      overlapAbortControllerRef.current = new AbortController();

      try {
        const res = await adminFetch(
          `/api/bookings/check-overlap?vehicleId=${form.vehicleId}&pickupDate=${form.pickupDate}&returnDate=${form.returnDate}`,
          { method: "GET", signal: overlapAbortControllerRef.current.signal }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setHasOverlappingBookings(data.hasOverlap || false);
      } catch (err) {
        // Ignore abort errors
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
      // Abort fetch on unmount
      if (overlapAbortControllerRef.current) {
        overlapAbortControllerRef.current.abort();
      }
    };
  }, [form.vehicleId, form.pickupDate, form.returnDate]);

  // Auto-calculate price (skipped when admin has manually set a custom price)
  useEffect(() => {
    if (manualPriceOverride) return;

    const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId);
    if (!selectedVehicle || !form.pickupDate || !form.returnDate) {
      setForm((prev) => ({ ...prev, totalPrice: 0 }));
      return;
    }

    const days = calculateDays();
    let baseTotal = days * (selectedVehicle.dailyRate ?? 0);
    let extrasTotal = 0;

    form.selectedExtras.forEach((extraId) => {
      const extra = AVAILABLE_EXTRAS.find((e) => e.id === extraId);
      if (extra) {
        if (extra.billingType === "per-day") {
          extrasTotal += days * extra.pricePerDay;
        } else if (extra.billingType === "per-day-capped" && extra.maxPrice) {
          extrasTotal += Math.min(days * extra.pricePerDay, extra.maxPrice);
        } else if (extra.billingType === "one-time") {
          extrasTotal += extra.pricePerDay;
        }
      }
    });

    const subtotal = baseTotal + extrasTotal;
    const tax = subtotal * 0.08;
    const total = Math.round((subtotal + tax) * 100) / 100;

    setForm((prev) => ({ ...prev, totalPrice: total }));
  }, [form.vehicleId, form.pickupDate, form.returnDate, form.selectedExtras, vehicles, manualPriceOverride]);

  // Toggle extra
  const toggleExtra = (extraId: string) => {
    setForm((prev) => ({
      ...prev,
      selectedExtras: prev.selectedExtras.includes(extraId)
        ? prev.selectedExtras.filter((id) => id !== extraId)
        : [...prev.selectedExtras, extraId],
    }));
  };

  // Validate form
  const validate = () => {
    if (!form.customerName.trim()) {
      onError("Customer name is required");
      return false;
    }
    if (!form.customerEmail.trim()) {
      onError("Customer email is required");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (form.customerEmail && !emailRegex.test(form.customerEmail)) {
      onError("Please enter a valid email address");
      return false;
    }
    if (!form.customerPhone.trim()) {
      onError("Customer phone is required");
      return false;
    }
    // Basic phone validation (10+ digits)
    const phoneDigits = form.customerPhone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      onError("Please enter a valid phone number (at least 10 digits)");
      return false;
    }
    if (!form.vehicleId) {
      onError("Vehicle is required");
      return false;
    }
    if (!form.pickupDate) {
      onError("Pickup date is required");
      return false;
    }
    if (!form.returnDate) {
      onError("Return date is required");
      return false;
    }
    const today = new Date().toISOString().split("T")[0];
    if (form.pickupDate < today) {
      onError("Pickup date must be today or later");
      return false;
    }
    if (form.returnDate <= form.pickupDate) {
      onError("Return date must be after pickup date");
      return false;
    }
    // If pickup and return date are the same, return time must be after pickup time
    if (form.returnDate === form.pickupDate) {
      if (form.returnTime <= form.pickupTime) {
        onError("Return time must be after pickup time when on the same day");
        return false;
      }
    }
    if (form.totalPrice <= 0) {
      onError("Total price must be greater than zero");
      return false;
    }
    return true;
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const pickupLoc = locations.find(l => l.id === pickupLocationId);
      const returnLoc = locations.find(l => l.id === (differentDropoff ? returnLocationId : pickupLocationId));
      const pickupSurcharge = pickupLoc?.surcharge ?? 0;
      const returnSurcharge = differentDropoff ? (returnLoc?.surcharge ?? 0) : 0;
      const payload = {
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone || null,
        vehicleId: form.vehicleId,
        pickupDate: form.pickupDate,
        returnDate: form.returnDate,
        pickupTime: form.pickupTime,
        returnTime: form.returnTime,
        totalPrice: form.totalPrice,
        deposit: form.deposit,
        status: form.status,
        selectedExtras: form.selectedExtras,
        paymentMethod: form.paymentMethod,
        pickup_location_id: pickupLocationId || null,
        return_location_id: differentDropoff ? returnLocationId : pickupLocationId || null,
        pickup_location_name: pickupLoc?.name || null,
        return_location_name: returnLoc?.name || null,
        location_surcharge: pickupSurcharge + returnSurcharge,
      };

      const res = await adminFetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        onError(error.message || "Failed to create booking");
        return;
      }

      const data = await res.json();
      const bookingId = data.data?.id || data.id;

      // Upload ID document if provided
      if (idDocument && bookingId) {
        try {
          const formData = new FormData();
          formData.append("file", idDocument);
          formData.append("bookingId", bookingId);
          formData.append("type", "id_document");
          await adminFetch("/api/bookings/upload", {
            method: "POST",
            body: formData,
          });
        } catch {
          // Don't fail the whole booking if upload fails
          onError("Booking created but ID upload failed. You can upload it later from the booking details.");
        }
      }

      onSuccess("Booking created successfully");
      setForm(emptyForm);
      setSearchValue("");
      setManualPriceOverride(false);
      setIdDocument(null);
      setIdDocumentPreview(null);
      onCreated();
    } catch (err) {
      onError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId);
  const days = calculateDays();

  /* ── Compute price breakdown for summary card ── */
  const baseTotal = selectedVehicle && days ? days * (selectedVehicle.dailyRate ?? 0) : 0;
  let extrasTotal = 0;
  form.selectedExtras.forEach((extraId) => {
    const extra = AVAILABLE_EXTRAS.find((e) => e.id === extraId);
    if (extra && days) {
      if (extra.billingType === "per-day") extrasTotal += days * extra.pricePerDay;
      else if (extra.billingType === "per-day-capped" && extra.maxPrice) extrasTotal += Math.min(days * extra.pricePerDay, extra.maxPrice);
      else if (extra.billingType === "one-time") extrasTotal += extra.pricePerDay;
    }
  });
  const subtotal = baseTotal + extrasTotal;
  const tax = subtotal * 0.08;

  /* ── Completion progress ── */
  const completedSteps = [
    form.customerName && form.customerEmail && form.customerPhone,
    form.vehicleId,
    form.pickupDate && form.returnDate,
    true, // extras are optional
  ].filter(Boolean).length;
  const progressPercent = Math.round((completedSteps / 4) * 100);

  return (
    <Card className="border-purple-200 overflow-hidden">
      {/* ═══ Header with progress ═══ */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-lg">New Booking</h2>
          <button type="button" onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="text-white/80 text-xs font-medium">{progressPercent}%</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">

        {/* ═══ SECTION 1: Customer ═══ */}
        <section className="space-y-4">
          <SectionHeader icon={User} title="Customer Information" subtitle="Search existing or add new customer" />

          {/* Search dropdown */}
          <div ref={dropdownRef} className="relative">
            <div className="relative">
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search existing customers by name or email..."
                value={searchValue}
                onChange={handleSearchChange}
                onFocus={() => searchValue && setShowDropdown(true)}
                className="pl-9 focus-visible:outline-2 focus-visible:outline-purple-600"
              />
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            {showDropdown && filteredCustomers.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => selectCustomer(customer)}
                    className="w-full text-left px-4 py-2.5 hover:bg-purple-50 transition-colors flex items-center gap-3 border-b border-gray-50 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold shrink-0">
                      {customer.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">{customer.name}</div>
                      <div className="text-xs text-gray-500 truncate">{customer.email}</div>
                    </div>
                  </button>
                ))}
                {filteredCustomers.length >= 8 && (
                  <div className="px-4 py-2 text-xs text-gray-400 bg-gray-50 border-t text-center">
                    Type more to narrow results...
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative flex items-center gap-3 py-1">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or enter details manually</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Full Name <span className="text-red-500">*</span></label>
              <Input
                type="text"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                placeholder="John Doe"
                className="focus-visible:outline-2 focus-visible:outline-purple-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Email Address <span className="text-red-500">*</span></label>
              <Input
                type="email"
                value={form.customerEmail}
                onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                placeholder="john@example.com"
                className="focus-visible:outline-2 focus-visible:outline-purple-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Phone Number <span className="text-red-500">*</span></label>
              <Input
                type="tel"
                value={form.customerPhone}
                onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                className="focus-visible:outline-2 focus-visible:outline-purple-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">ID Document <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                ref={idInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleIdFileChange}
                className="hidden"
              />
              {idDocumentPreview ? (
                <div className="relative inline-block">
                  <img src={idDocumentPreview} alt="ID preview" className="h-[38px] w-auto rounded-lg border border-gray-200 object-cover" />
                  <button type="button" onClick={() => { setIdDocument(null); setIdDocumentPreview(null); if (idInputRef.current) idInputRef.current.value = ""; }} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : idDocument ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                  <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700 truncate flex-1">{idDocument.name}</span>
                  <button type="button" onClick={() => { setIdDocument(null); if (idInputRef.current) idInputRef.current.value = ""; }} className="text-red-500 hover:text-red-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => idInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50/50 transition-colors w-full"
                >
                  <Upload className="w-4 h-4" />
                  Upload license, passport, or ID
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ═══ SECTION 2: Vehicle ═══ */}
        <section className="space-y-4">
          <SectionHeader icon={Car} title="Vehicle Selection" subtitle="Choose from available fleet" />

          <Select
            value={form.vehicleId}
            onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
          >
            <option value="">Select a vehicle...</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id} disabled={!v.isAvailable}>
                {v.year} {v.make} {v.model} — ${v.dailyRate}/day{!v.isAvailable ? " (Unavailable)" : ""}
              </option>
            ))}
          </Select>

          {/* Selected vehicle preview card */}
          {selectedVehicle && (
            <div className="flex items-center gap-4 p-3 bg-purple-50 border border-purple-100 rounded-xl">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                <Car className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900">{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</p>
                <p className="text-xs text-gray-600">{selectedVehicle.year} &middot; {selectedVehicle.isAvailable ? "Available" : "Unavailable"}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-purple-600">${selectedVehicle.dailyRate}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">per day</p>
              </div>
            </div>
          )}

          {hasOverlappingBookings && (
            <div className="flex gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">This vehicle has overlapping bookings for the selected dates. Proceed with caution.</div>
            </div>
          )}
        </section>

        {/* ═══ SECTION 3: Dates & Location ═══ */}
        <section className="space-y-4">
          <SectionHeader icon={CalendarDays} title="Rental Period" subtitle="Set pickup and return schedule" />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Pickup Date <span className="text-red-500">*</span></label>
              <Input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={form.pickupDate}
                onChange={(e) => setForm({ ...form, pickupDate: e.target.value })}
                className="focus-visible:outline-2 focus-visible:outline-purple-600 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Pickup Time <span className="text-red-500">*</span></label>
              <Select
                value={form.pickupTime}
                onChange={(e) => setForm({ ...form, pickupTime: e.target.value })}
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot.value} value={slot.value}>{slot.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Return Date <span className="text-red-500">*</span></label>
              <Input
                type="date"
                value={form.returnDate}
                onChange={(e) => setForm({ ...form, returnDate: e.target.value })}
                className="focus-visible:outline-2 focus-visible:outline-purple-600 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Return Time <span className="text-red-500">*</span></label>
              <Select
                value={form.returnTime}
                onChange={(e) => setForm({ ...form, returnTime: e.target.value })}
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot.value} value={slot.value}>{slot.label}</option>
                ))}
              </Select>
            </div>
          </div>

          {/* Duration badge */}
          {days > 0 && (
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                <Clock className="w-3 h-3" />
                {days} day{days !== 1 ? "s" : ""}
              </div>
            </div>
          )}

          {/* Locations */}
          {!locationsLoading && locations.length > 0 && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-purple-500" /> Pickup Location
                </label>
                <Select
                  value={pickupLocationId}
                  onChange={(e) => {
                    setPickupLocationId(e.target.value);
                    if (!differentDropoff) setReturnLocationId(e.target.value);
                  }}
                >
                  <option value="">Select location...</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name}{l.surcharge > 0 ? ` (+$${l.surcharge.toFixed(2)})` : ''}{l.is_default ? ' (Default)' : ''}
                    </option>
                  ))}
                </Select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={differentDropoff} onChange={(e) => { setDifferentDropoff(e.target.checked); if (!e.target.checked) setReturnLocationId(pickupLocationId); }} className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                <span className="text-xs text-gray-600">Different dropoff location</span>
              </label>
              {differentDropoff && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-purple-500" /> Dropoff Location
                  </label>
                  <Select
                    value={returnLocationId}
                    onChange={(e) => setReturnLocationId(e.target.value)}
                  >
                    <option value="">Select location...</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.name}{l.surcharge > 0 ? ` (+$${l.surcharge.toFixed(2)})` : ''}{l.is_default ? ' (Default)' : ''}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ═══ SECTION 4: Extras ═══ */}
        <section className="space-y-4">
          <SectionHeader icon={Package} title="Extras & Insurance" subtitle="Optional add-ons for this booking" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AVAILABLE_EXTRAS.map((extra) => {
              const isSelected = form.selectedExtras.includes(extra.id);
              return (
                <button
                  key={extra.id}
                  type="button"
                  onClick={() => toggleExtra(extra.id)}
                  className={`p-3.5 border-2 rounded-xl text-left transition-all ${
                    isSelected
                      ? "border-purple-500 bg-purple-50 shadow-sm shadow-purple-100"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        isSelected ? "bg-purple-500 border-purple-500" : "border-gray-300"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900">
                        {extra.name}
                        {extra.id === "e1" && (
                          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md bg-green-100 text-green-700 text-[10px] font-semibold uppercase">Recommended</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{extra.description}</div>
                      <div className="text-xs font-semibold text-purple-600 mt-1">
                        ${extra.pricePerDay}
                        {extra.billingType === "per-day" && "/day"}
                        {extra.billingType === "per-day-capped" && ` (max $${extra.maxPrice})`}
                        {extra.billingType === "one-time" && " one-time"}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ═══ SECTION 5: Payment & Pricing ═══ */}
        <section className="space-y-4">
          <SectionHeader icon={CreditCard} title="Payment & Pricing" subtitle="Review total and payment method" />

          {/* Price breakdown summary */}
          {selectedVehicle && days > 0 && !manualPriceOverride && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>${selectedVehicle.dailyRate}/day &times; {days} day{days !== 1 ? "s" : ""}</span>
                <span>${baseTotal.toFixed(2)}</span>
              </div>
              {extrasTotal > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Extras & add-ons</span>
                  <span>${extrasTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Tax (8%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Estimated Total</span>
                <span className="text-purple-600">${(subtotal + tax).toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Total Price ($)</label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.totalPrice}
                  onChange={(e) => {
                    const amount = parseFloat(e.target.value);
                    setManualPriceOverride(true);
                    setForm({ ...form, totalPrice: isNaN(amount) ? 0 : Math.max(0, amount) });
                  }}
                  placeholder="0.00"
                  className={manualPriceOverride ? "border-amber-400 bg-amber-50/50 pr-10" : ""}
                />
                {manualPriceOverride && (
                  <button
                    type="button"
                    onClick={() => setManualPriceOverride(false)}
                    title="Recalculate from daily rate"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-purple-500 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
                  >
                    <Calculator className="w-4 h-4" />
                  </button>
                )}
              </div>
              {manualPriceOverride && (
                <p className="text-[10px] text-amber-600 mt-1 font-medium">Custom price — tap calculator to restore</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Amount Paid ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.deposit}
                onChange={(e) => {
                  const amount = parseFloat(e.target.value);
                  setForm({ ...form, deposit: isNaN(amount) ? 0 : Math.max(0, amount) });
                }}
                placeholder="0.00"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                {form.deposit === 0 && form.totalPrice > 0
                  ? "No payment recorded"
                  : form.deposit > 0 && form.deposit < form.totalPrice
                  ? `$${(form.totalPrice - form.deposit).toFixed(2)} remaining`
                  : form.deposit >= form.totalPrice && form.totalPrice > 0
                  ? "Fully paid"
                  : "Leave at $0 if unpaid"}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Payment Method</label>
              <Select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-700">
            <Shield className="w-4 h-4 shrink-0" />
            <span>Status: <strong>Pending</strong> — confirm after the customer signs the rental agreement</span>
          </div>
        </section>

        {/* ═══ ACTION BUTTONS ═══ */}
        <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
          <Button type="button" onClick={onClose} variant="outline" disabled={loading} className="px-5">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 shadow-sm shadow-purple-200"
          >
            {loading ? (
              <span className="flex items-center gap-2"><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Creating...</span>
            ) : (
              "Create Booking"
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
