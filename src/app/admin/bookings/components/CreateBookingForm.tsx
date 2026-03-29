"use client";

import { useState, useRef, useEffect } from "react";
import { X, Check, AlertTriangle, Calculator, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  status: "pending",
  selectedExtras: ["e1"],
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

  // Calculate days
  const calculateDays = () => {
    if (!form.pickupDate || !form.returnDate) return 0;
    const pickup = new Date(form.pickupDate).getTime();
    const returnDate = new Date(form.returnDate).getTime();
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
    if (form.returnDate < form.pickupDate) {
      onError("Return date must be after pickup date");
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

      onSuccess("Booking created successfully");
      setForm(emptyForm);
      setSearchValue("");
      setManualPriceOverride(false);
      onCreated();
    } catch (err) {
      onError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId);
  const days = calculateDays();

  return (
    <Card className="border-purple-200 p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* CUSTOMER SEARCH DROPDOWN */}
        <div ref={dropdownRef} className="relative">
          <label className="block text-sm font-medium mb-2">Find Existing Customer</label>
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search by name or email..."
            value={searchValue}
            onChange={handleSearchChange}
            onFocus={() => searchValue && setShowDropdown(true)}
            className="w-full"
          />
          {showDropdown && filteredCustomers.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-50">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => selectCustomer(customer)}
                  className="w-full text-left px-4 py-2 hover:bg-purple-50"
                >
                  <div className="font-medium">{customer.name}</div>
                  <div className="text-xs text-gray-500">{customer.email}</div>
                </button>
              ))}
              {filteredCustomers.length >= 8 && (
                <div className="px-4 py-2 text-xs text-gray-400 bg-gray-50 border-t">
                  Type more to narrow results...
                </div>
              )}
            </div>
          )}
          <div className="my-3 text-xs text-gray-400 text-center">
            ──────── Or enter new customer details below ────────
          </div>
        </div>

        {/* CUSTOMER FIELDS */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Customer Name <span className="text-red-500">*</span></label>
            <Input
              type="text"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              placeholder="John Doe"
              className="focus-visible:outline-2 focus-visible:outline-purple-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email <span className="text-red-500">*</span></label>
            <Input
              type="email"
              value={form.customerEmail}
              onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
              placeholder="john@example.com"
              className="focus-visible:outline-2 focus-visible:outline-purple-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Phone (Optional)</label>
          <Input
            type="tel"
            value={form.customerPhone}
            onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
            placeholder="+1 (555) 123-4567"
          />
        </div>

        {/* VEHICLE SELECT */}
        <div>
          <label className="block text-sm font-medium mb-1">Vehicle <span className="text-red-500">*</span></label>
          <select
            value={form.vehicleId}
            onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
            className="w-full px-3 py-2 border rounded text-sm focus-visible:outline-2 focus-visible:outline-purple-600 outline-none"
          >
            <option value="">Select a vehicle</option>
            {vehicles.map((v) => (
              <option
                key={v.id}
                value={v.id}
                disabled={!v.isAvailable}
                className={!v.isAvailable ? "text-gray-400" : ""}
              >
                {v.year} {v.make} {v.model} — ${v.dailyRate}/day
                {!v.isAvailable ? " (Unavailable)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* OVERLAP WARNING */}
        {hasOverlappingBookings && (
          <div className="flex gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              This vehicle has overlapping bookings for the selected dates. Please review.
            </div>
          </div>
        )}

        {/* DATE/TIME FIELDS */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Pickup Date <span className="text-red-500">*</span></label>
            <Input
              type="date"
              min={new Date().toISOString().split("T")[0]}
              value={form.pickupDate}
              onChange={(e) => setForm({ ...form, pickupDate: e.target.value })}
              className="focus-visible:outline-2 focus-visible:outline-purple-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Pickup Time <span className="text-red-500">*</span></label>
            <select
              value={form.pickupTime}
              onChange={(e) => setForm({ ...form, pickupTime: e.target.value })}
              className="w-full px-3 py-2 border rounded text-sm focus-visible:outline-2 focus-visible:outline-purple-600 outline-none"
            >
              {TIME_SLOTS.map((slot) => (
                <option key={slot.value} value={slot.value}>
                  {slot.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Return Date <span className="text-red-500">*</span></label>
            <Input
              type="date"
              value={form.returnDate}
              onChange={(e) => setForm({ ...form, returnDate: e.target.value })}
              className="focus-visible:outline-2 focus-visible:outline-purple-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Return Time <span className="text-red-500">*</span></label>
            <select
              value={form.returnTime}
              onChange={(e) => setForm({ ...form, returnTime: e.target.value })}
              className="w-full px-3 py-2 border rounded text-sm focus-visible:outline-2 focus-visible:outline-purple-600 outline-none"
            >
              {TIME_SLOTS.map((slot) => (
                <option key={slot.value} value={slot.value}>
                  {slot.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Locations */}
        {!locationsLoading && locations.length > 0 && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Pickup Location
              </label>
              <select
                value={pickupLocationId}
                onChange={(e) => {
                  setPickupLocationId(e.target.value);
                  if (!differentDropoff) setReturnLocationId(e.target.value);
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select location...</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.name}{l.surcharge > 0 ? ` (+$${l.surcharge.toFixed(2)})` : ''}{l.is_default ? ' (Default)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={differentDropoff} onChange={(e) => { setDifferentDropoff(e.target.checked); if (!e.target.checked) setReturnLocationId(pickupLocationId); }} className="rounded border-gray-300 text-purple-600" />
              <span className="text-xs text-gray-600">Different dropoff location</span>
            </label>
            {differentDropoff && (
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Dropoff Location
                </label>
                <select
                  value={returnLocationId}
                  onChange={(e) => setReturnLocationId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select location...</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name}{l.surcharge > 0 ? ` (+$${l.surcharge.toFixed(2)})` : ''}{l.is_default ? ' (Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* EXTRAS / INSURANCE */}
        <div>
          <label className="block text-sm font-medium mb-3">Extras & Insurance</label>
          <div className="grid grid-cols-2 gap-3">
            {AVAILABLE_EXTRAS.map((extra) => (
              <button
                key={extra.id}
                type="button"
                onClick={() => toggleExtra(extra.id)}
                className={`p-3 border-2 rounded text-left transition ${
                  form.selectedExtras.includes(extra.id)
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      form.selectedExtras.includes(extra.id)
                        ? "bg-purple-500 border-purple-500"
                        : "border-gray-300"
                    }`}
                  >
                    {form.selectedExtras.includes(extra.id) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {extra.name}
                      {extra.id === "e1" && <span className="text-green-600 ml-1">(Recommended)</span>}
                    </div>
                    <div className="text-xs text-gray-600">{extra.description}</div>
                    <div className="text-xs font-medium text-purple-600 mt-1">
                      ${extra.pricePerDay}
                      {extra.billingType === "per-day" && "/day"}
                      {extra.billingType === "per-day-capped" && ` (max: $${extra.maxPrice})`}
                      {extra.billingType === "one-time" && " (one-time)"}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* PAYMENT METHOD */}
        <div>
          <label className="block text-sm font-medium mb-1">Payment Method</label>
          <select
            value={form.paymentMethod}
            onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
            className="w-full px-3 py-2 border rounded text-sm focus-visible:outline-2 focus-visible:outline-purple-600 outline-none"
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>

        {/* PRICE + STATUS */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Total Price ($)</label>
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
            <div className="text-xs text-gray-500 mt-1">
              {manualPriceOverride
                ? "Custom price — tap calculator to restore auto-pricing"
                : "Auto-calculated from daily rate, editable for custom pricing"}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Initial Status</label>
            <p className="text-sm text-gray-500 px-3 py-2 bg-gray-50 border rounded">
              Pending — booking can be confirmed after the customer signs the rental agreement
            </p>
          </div>
        </div>

        {/* BUTTONS */}
        <div className="flex gap-3 justify-end pt-4">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {loading ? "Creating..." : "Create Booking"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
