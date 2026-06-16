"use client";

import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { PAYMENT_METHODS } from "@/lib/types";
import { StaffCenterModal } from "@/components/staff/staff-overlay";

export interface VehicleSaleSummary {
  id: string;
  vehicleId: string;
  saleDate: string;
  salePrice: number;
  buyerName: string;
  pdfDownloadUrl?: string | null;
}

interface SellVehicleDialogProps {
  vehicleId: string;
  vehicleMileage: number;
  open: boolean;
  onClose: () => void;
  onSold: (sale: VehicleSaleSummary) => void;
}

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

export function SellVehicleDialog({
  vehicleId,
  vehicleMileage,
  open,
  onClose,
  onSold,
}: SellVehicleDialogProps) {
  const [buyerName, setBuyerName] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [saleDate, setSaleDate] = useState(todayIso);
  const [salePrice, setSalePrice] = useState("");
  const [odometer, setOdometer] = useState(String(vehicleMileage || ""));
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) {
      setError("Please confirm that the vehicle will be removed from the rental fleet.");
      return;
    }
    const price = parseFloat(salePrice);
    if (!buyerName.trim() || !buyerAddress.trim() || !Number.isFinite(price) || price <= 0) {
      setError("Buyer name, address, and a valid sale price are required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/vehicles/${encodeURIComponent(vehicleId)}/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerName: buyerName.trim(),
          buyerAddress: buyerAddress.trim(),
          buyerPhone: buyerPhone.trim() || undefined,
          buyerEmail: buyerEmail.trim() || undefined,
          saleDate,
          salePrice: price,
          odometer: odometer ? parseInt(odometer, 10) : undefined,
          paymentMethod: paymentMethod || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to record sale");
      }
      const sale = json.data as VehicleSaleSummary;
      if (sale.pdfDownloadUrl) {
        window.open(sale.pdfDownloadUrl, "_blank", "noopener,noreferrer");
      }
      onSold(sale);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sell vehicle");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StaffCenterModal onClose={onClose} ariaLabel="Sell vehicle" className="max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 id="sell-vehicle-title" className="text-lg font-semibold text-gray-900">
            Sell vehicle
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          A bill of sale PDF will be generated and stored. The vehicle will be unpublished and marked unavailable.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Buyer name *</label>
            <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} required className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Buyer address *</label>
            <Textarea
              value={buyerAddress}
              onChange={(e) => setBuyerAddress(e.target.value)}
              required
              rows={2}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <Input value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Sale date *</label>
              <Input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Sale price *</label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                required
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Odometer</label>
              <Input
                type="number"
                min="0"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Payment method</label>
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-1 w-full"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" />
          </div>

          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1"
            />
            <span>
              This will unpublish the vehicle and remove it from the rental fleet. This cannot be undone from the app.
            </span>
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing…
                </>
              ) : (
                "Complete sale"
              )}
            </Button>
          </div>
        </form>
    </StaffCenterModal>
  );
}