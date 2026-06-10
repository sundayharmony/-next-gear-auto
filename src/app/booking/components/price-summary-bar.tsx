"use client";

import { calculateRentalHours } from "@/lib/utils/price-calculator";
import type { Vehicle } from "@/lib/types";

export function PriceSummaryBar({
  selectedVehicle,
  pickupDate,
  returnDate,
  pickupTime,
  returnTime,
  extrasCount,
  checkoutTotal,
  hasPricing,
}: {
  selectedVehicle: Vehicle;
  pickupDate: string;
  returnDate: string;
  pickupTime: string;
  returnTime: string;
  extrasCount: number;
  checkoutTotal: number;
  hasPricing: boolean;
}) {
  const hours = calculateRentalHours(pickupDate, returnDate, pickupTime, returnTime);
  const hourlyRate = selectedVehicle.dailyRate / 24;

  return (
    <div className="border-b border-purple-100 bg-purple-50/60">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="flex flex-wrap items-center gap-3 text-gray-600">
            <span className="font-medium text-gray-900">
              {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
            </span>
            <span className="text-gray-400">|</span>
            <span>
              {hours} hour{hours > 1 ? "s" : ""} x ${hourlyRate.toFixed(2)}/hour
            </span>
            {extrasCount > 0 && (
              <>
                <span className="text-gray-400">+</span>
                <span>{extrasCount} extra{extrasCount > 1 ? "s" : ""}</span>
              </>
            )}
          </div>
          <div className="text-right">
            {hasPricing ? (
              <span className="text-lg font-bold text-purple-700">
                ${checkoutTotal.toFixed(2)}
                <span className="text-xs font-normal text-gray-500 ml-1">total</span>
              </span>
            ) : (
              <span className="text-lg font-bold text-purple-700">
                ${(() => {
                  const base = (selectedVehicle.dailyRate / 24) * hours;
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
  );
}
