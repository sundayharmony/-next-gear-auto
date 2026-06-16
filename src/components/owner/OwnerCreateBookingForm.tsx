"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Car, Loader2, MapPin, User, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { isYyyyMmDd, isoDateOrderingOk } from "@/lib/utils/booking-dates";
import { calculatePricing, calculateRentalHours } from "@/lib/utils/price-calculator";
import { isValidEmailFormat } from "@/lib/utils/validation";
import type { Location } from "@/lib/types";
import type { OwnerVehicle } from "@/lib/types";
import { BookingFormSectionHeader } from "@/components/forms/booking-form-section-header";
import { FormField } from "@/components/ui/form-field";

const TIME_SLOTS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

export interface OwnerCreateBookingFormProps {
  vehicles: OwnerVehicle[];
  onClose: () => void;
  onCreated: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
  createEndpoint?: string;
}

export function OwnerCreateBookingForm({
  vehicles,
  onClose,
  onCreated,
  onError,
  onSuccess,
  createEndpoint = "/api/owner/bookings",
}: OwnerCreateBookingFormProps) {
  const [vehicleId, setVehicleId] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [pickupTime, setPickupTime] = useState("10:00");
  const [returnTime, setReturnTime] = useState("10:00");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [pickupLocationId, setPickupLocationId] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === vehicleId) ?? null,
    [vehicles, vehicleId]
  );

  const estimatedTotal = useMemo(() => {
    if (!selectedVehicle || !pickupDate || !returnDate || !isYyyyMmDd(pickupDate) || !isYyyyMmDd(returnDate)) {
      return 0;
    }
    if (!isoDateOrderingOk(pickupDate, returnDate)) return 0;
    const hours = calculateRentalHours(pickupDate, returnDate, pickupTime, returnTime);
    const pricing = calculatePricing(hours, selectedVehicle.dailyRate, []);
    return pricing.total;
  }, [selectedVehicle, pickupDate, returnDate, pickupTime, returnTime]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLocationsLoading(true);
      try {
        const res = await adminFetch("/api/locations");
        const json = await res.json();
        if (!cancelled && json.success) {
          const active = (json.data as Location[]).filter((l) => l.is_active !== false);
          setLocations(active);
          if (active.length === 1) setPickupLocationId(active[0].id);
        }
      } catch {
        if (!cancelled) onError("Could not load pickup locations");
      } finally {
        if (!cancelled) setLocationsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onError]);

  useEffect(() => {
    if (!vehicleId && vehicles.length === 1) setVehicleId(vehicles[0].id);
  }, [vehicles, vehicleId]);

  const validate = (): boolean => {
    if (!vehicleId) {
      onError("Select a vehicle");
      return false;
    }
    if (!customerName.trim()) {
      onError("Guest name is required");
      return false;
    }
    if (!customerEmail.trim() || !isValidEmailFormat(customerEmail.trim())) {
      onError("A valid guest email is required");
      return false;
    }
    if (!pickupDate || !returnDate) {
      onError("Pickup and return dates are required");
      return false;
    }
    if (!isoDateOrderingOk(pickupDate, returnDate)) {
      onError("Return date must be on or after pickup date");
      return false;
    }
    if (pickupDate === returnDate && returnTime <= pickupTime) {
      onError("Return time must be after pickup time on the same day");
      return false;
    }
    if (estimatedTotal <= 0) {
      onError("Could not calculate rental price — check dates and vehicle rate");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const pickupLoc = locations.find((l) => l.id === pickupLocationId);
    setLoading(true);
    try {
      const res = await adminFetch(createEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          pickupDate,
          returnDate,
          pickupTime,
          returnTime,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim() || null,
          totalPrice: estimatedTotal,
          deposit: 0,
          status: "pending",
          adminNotes: notes.trim() || null,
          pickupLocationId: pickupLocationId || null,
          returnLocationId: pickupLocationId || null,
          locationSurcharge: pickupLoc?.surcharge ?? 0,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        onError(json.message || "Failed to create booking");
        return;
      }
      onSuccess("Booking created successfully");
      onCreated();
    } catch {
      onError("Network error — could not create booking");
    } finally {
      setLoading(false);
    }
  };

  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <Card className="relative overflow-hidden border border-gray-200/80 shadow-lg">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-3 sm:px-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">New reservation</h2>
          <p className="text-xs text-gray-500">Book a guest on one of your vehicles</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6">
        <section className="space-y-4">
          <BookingFormSectionHeader icon={Car} title="Vehicle" subtitle="Only vehicles assigned to your account" />
          <Select
            label="Vehicle"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            required
          >
            <option value="">Select vehicle…</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.year} {v.make} {v.model} — ${v.dailyRate}/day
              </option>
            ))}
          </Select>
        </section>

        <section className="space-y-4">
          <BookingFormSectionHeader icon={CalendarDays} title="Dates & times" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DatePicker label="Pickup date" value={pickupDate} onChange={setPickupDate} min={todayKey} />
            <DatePicker label="Return date" value={returnDate} onChange={setReturnDate} min={pickupDate || todayKey} />
            <Select label="Pickup time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)}>
              {TIME_SLOTS.map((t) => (
                <option key={`pu-${t}`} value={t}>{t}</option>
              ))}
            </Select>
            <Select label="Return time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)}>
              {TIME_SLOTS.map((t) => (
                <option key={`rt-${t}`} value={t}>{t}</option>
              ))}
            </Select>
          </div>
          {estimatedTotal > 0 && (
            <p className="text-sm text-gray-600">
              Estimated total: <span className="font-semibold text-gray-900">${estimatedTotal.toFixed(2)}</span>
            </p>
          )}
        </section>

        <section className="space-y-4">
          <BookingFormSectionHeader icon={User} title="Guest contact" subtitle="Required for the rental agreement" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Guest name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            <Input label="Email" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} required />
            <Input label="Phone (optional)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="sm:col-span-2" />
          </div>
        </section>

        <section className="space-y-4">
          <BookingFormSectionHeader icon={MapPin} title="Pickup location" />
          {locationsLoading ? (
            <p className="text-sm text-gray-500">Loading locations…</p>
          ) : locations.length === 0 ? (
            <p className="text-sm text-amber-700">No active locations configured — contact admin.</p>
          ) : (
            <Select label="Location" value={pickupLocationId} onChange={(e) => setPickupLocationId(e.target.value)}>
              <option value="">Select location…</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}{l.surcharge ? ` (+$${l.surcharge})` : ""}
                </option>
              ))}
            </Select>
          )}
        </section>

        <section className="space-y-3">
          <Textarea
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special instructions for staff or the guest…"
            rows={3}
          />
        </section>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || vehicles.length === 0}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" role="status" aria-label="Creating booking" /> : "Create booking"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
