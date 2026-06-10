"use client";

import { MapPin, PenLine, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AgreementSigningWizard } from "@/components/agreement-signing-wizard";
import { formatDate, formatTime } from "@/lib/utils/date-helpers";
import type { CustomerDetailsState } from "@/lib/booking/wizard-validation";
import type { Vehicle } from "@/lib/types";

const formatTime24To12 = formatTime;

export interface ReviewStepProps {
  selectedVehicle: Vehicle | null;
  pickupDate: string;
  returnDate: string;
  pickupTime: string;
  returnTime: string;
  pickupLocationName: string | null;
  returnLocationName: string | null;
  pricing: {
    baseHours: number;
    hourlyRate: number;
    baseTotal: number;
    extras: { name: string; total: number }[];
    insuranceDiscount: number;
    setupFee: number;
    tax: number;
    total: number;
  } | null;
  promoCode: string | null;
  promoDiscount: { discountAmount: number; description?: string } | null;
  locationSurcharge: number;
  checkoutTotal: number;
  promoInput: string;
  setPromoInput: (value: string) => void;
  promoLoading: boolean;
  promoError: string;
  setPromoError: (error: string) => void;
  onApplyPromo: () => void;
  onRemovePromo: () => void;
  details: CustomerDetailsState;
  agreementSignatures: Record<string, string | null>;
  setAgreementSignatures: (signatures: Record<string, string | null>) => void;
  signedName: string;
  setSignedName: (name: string) => void;
}

export function ReviewStep({
  selectedVehicle,
  pickupDate,
  returnDate,
  pickupTime,
  returnTime,
  pickupLocationName,
  returnLocationName,
  pricing,
  promoCode,
  promoDiscount,
  locationSurcharge,
  checkoutTotal,
  promoInput,
  setPromoInput,
  promoLoading,
  promoError,
  setPromoError,
  onApplyPromo,
  onRemovePromo,
  details,
  agreementSignatures,
  setAgreementSignatures,
  signedName,
  setSignedName,
}: ReviewStepProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Summary</h2>
          {selectedVehicle && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Vehicle</span>
                <span className="font-medium text-gray-900">
                  {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                </span>
              </div>
              <div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pick-up</span>
                  <span className="text-lg font-bold text-gray-900">{formatDate(pickupDate)}</span>
                </div>
                {pickupTime && (
                  <div className="flex justify-between">
                    <span></span>
                    <span className="text-xl font-bold text-purple-600">{formatTime24To12(pickupTime)}</span>
                  </div>
                )}
              </div>
              <div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Return</span>
                  <span className="text-lg font-bold text-gray-900">{formatDate(returnDate)}</span>
                </div>
                {returnTime && (
                  <div className="flex justify-between">
                    <span></span>
                    <span className="text-xl font-bold text-purple-600">{formatTime24To12(returnTime)}</span>
                  </div>
                )}
              </div>
              {(pickupLocationName || returnLocationName) && (
                <div className="border-t pt-3 space-y-2">
                  {pickupLocationName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        Pickup Location
                      </span>
                      <span className="font-medium text-gray-900">{pickupLocationName}</span>
                    </div>
                  )}
                  {returnLocationName && returnLocationName !== pickupLocationName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        Dropoff Location
                      </span>
                      <span className="font-medium text-gray-900">{returnLocationName}</span>
                    </div>
                  )}
                </div>
              )}
              {pricing && (
                <>
                  <div className="border-t pt-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        Base ({pricing.baseHours} hour{pricing.baseHours !== 1 ? "s" : ""} @ $
                        {pricing.hourlyRate.toFixed(2)}/hr)
                      </span>
                      <span>${pricing.baseTotal.toFixed(2)}</span>
                    </div>
                    {pricing.extras.map((e) => (
                      <div key={e.name} className="flex justify-between text-sm">
                        <span className="text-gray-500">{e.name}</span>
                        <span>${e.total.toFixed(2)}</span>
                      </div>
                    ))}
                    {pricing.insuranceDiscount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Insurance discount (15% off)</span>
                        <span>-${pricing.insuranceDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    {pricing.setupFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Setup fee</span>
                        <span>${pricing.setupFee.toFixed(2)}</span>
                      </div>
                    )}
                    {promoDiscount && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          Promo: {promoCode}
                        </span>
                        <span>-${promoDiscount.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {locationSurcharge > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Location Surcharge</span>
                        <span>${locationSurcharge.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tax</span>
                      <span>${pricing.tax.toFixed(2)}</span>
                    </div>
                  </div>
                  {pricing.insuranceDiscount > 0 && (
                    <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-xs text-green-700 mt-2">
                      You&apos;re saving ${pricing.insuranceDiscount.toFixed(2)} on insurance coverage.
                    </div>
                  )}
                  <div className="border-t pt-3 flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-purple-600">${checkoutTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Total Due</span>
                    <span className="text-purple-600">${checkoutTotal.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Tag className="h-4 w-4 text-purple-600" />
            Promo Code
          </h3>
          {promoCode ? (
            <div className="flex items-center justify-between rounded-lg bg-green-50 border border-green-200 p-3">
              <div>
                <span className="font-medium text-green-700">{promoCode}</span>
                <span className="ml-2 text-sm text-green-600">
                  — {promoDiscount?.description || "Discount applied"}
                </span>
              </div>
              <button onClick={onRemovePromo} aria-label="Remove promo code" className="text-green-600 hover:text-green-800">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter promo code"
                  value={promoInput}
                  onChange={(e) => {
                    setPromoInput(e.target.value);
                    setPromoError("");
                  }}
                  className="uppercase"
                />
                <Button variant="outline" onClick={onApplyPromo} disabled={promoLoading || !promoInput.trim()} aria-busy={promoLoading}>
                  {promoLoading ? (
                    <>
                      <span className="animate-spin inline-block h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full mr-2" />
                      Applying...
                    </>
                  ) : (
                    "Apply"
                  )}
                </Button>
              </div>
              {promoError && <p className="mt-2 text-sm text-red-600">{promoError}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <PenLine className="h-4 w-4 text-purple-600" />
            Rental Agreement
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Draw your signature once, then read each page and tap each box to sign. Pages advance
            automatically when complete.
          </p>

          {selectedVehicle ? (
            <AgreementSigningWizard
              embedded
              booking={{
                customer_name: details.name,
                customer_email: details.email,
                customer_phone: details.phone,
                pickup_date: pickupDate,
                return_date: returnDate,
                pickup_time: pickupTime,
                return_time: returnTime,
                total_price: pricing?.total || 0,
              }}
              vehicle={{
                make: selectedVehicle.make,
                model: selectedVehicle.model,
                year: selectedVehicle.year,
                licensePlate: selectedVehicle.licensePlate,
                vin: selectedVehicle.vin,
                color: selectedVehicle.color,
                mileage: selectedVehicle.mileage,
              }}
              signatures={agreementSignatures}
              onSignaturesChange={setAgreementSignatures}
              legalName={signedName}
              onLegalNameChange={setSignedName}
              agreementFooterNote="Review the text above, then tap each signature box below."
            />
          ) : (
            <p className="text-sm text-amber-700">Select a vehicle to view and sign the agreement.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
