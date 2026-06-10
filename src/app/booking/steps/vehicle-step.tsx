"use client";

import { Briefcase, Check, Fuel, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { VehicleThumbnail } from "@/components/vehicle-thumbnail";
import type { Vehicle } from "@/lib/types";

export interface VehicleStepProps {
  vehicles: Vehicle[];
  vehiclesLoading: boolean;
  vehiclesError: string | null;
  retryVehicles: () => void;
  checkingAvailability: boolean;
  availabilityError: string | null;
  retryAvailability: () => void;
  urlVehicleUnavailable: boolean;
  selectedVehicleId: string | undefined;
  isVehicleBooked: (vehicleId: string) => boolean;
  onSelectVehicle: (vehicle: Vehicle) => void;
}

export function VehicleStep({
  vehicles,
  vehiclesLoading,
  vehiclesError,
  retryVehicles,
  checkingAvailability,
  availabilityError,
  retryAvailability,
  urlVehicleUnavailable,
  selectedVehicleId,
  isVehicleBooked,
  onSelectVehicle,
}: VehicleStepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Choose Your Vehicle</h2>
      <p className="text-sm text-gray-500">Select from our available fleet for your dates.</p>
      {vehiclesError && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200 flex items-center justify-between gap-3">
          <span>{vehiclesError}</span>
          <button
            onClick={retryVehicles}
            className="shrink-0 rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
      {vehiclesLoading && (
        <div className="rounded-lg bg-purple-50 p-3 text-sm text-purple-600 flex items-center gap-2">
          <span className="animate-spin inline-block h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full" />
          Loading vehicles...
        </div>
      )}
      {checkingAvailability && (
        <div className="rounded-lg bg-purple-50 p-3 text-sm text-purple-600 flex items-center gap-2" role="status" aria-live="polite">
          <span className="animate-spin inline-block h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full" />
          Checking vehicle availability...
        </div>
      )}
      {availabilityError && !checkingAvailability && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900 flex flex-wrap items-center justify-between gap-2">
          <span>{availabilityError}</span>
          <Button type="button" variant="outline" size="sm" onClick={retryAvailability}>
            Retry
          </Button>
        </div>
      )}
      {urlVehicleUnavailable && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          The vehicle in this link is no longer available for booking. Please choose another vehicle below.
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
                booked ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:shadow-md",
                !booked && selectedVehicleId === vehicle.id && "ring-2 ring-purple-600 shadow-md"
              )}
              onClick={() => !booked && onSelectVehicle(vehicle)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  <VehicleThumbnail
                    src={vehicle.images?.[0]}
                    alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={cn("font-semibold", booked ? "text-gray-400" : "text-gray-900")}>
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </h3>
                    <Badge variant="secondary">{vehicle.category}</Badge>
                    {booked && <Badge className="bg-red-100 text-red-600 text-xs">Booked for these dates</Badge>}
                  </div>
                  <div className="mt-1 flex gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {vehicle.specs.passengers}</span>
                    <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {vehicle.specs.luggage}</span>
                    <span className="flex items-center gap-1"><Fuel className="h-3 w-3" /> {vehicle.specs.mpg} mpg</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={cn("text-xl font-bold", booked ? "text-gray-400" : "text-purple-600")}>
                    ${vehicle.dailyRate}
                  </div>
                  <div className="text-xs text-gray-400">/day</div>
                </div>
                {!booked && selectedVehicleId === vehicle.id && (
                  <Check className="h-5 w-5 shrink-0 text-purple-600" />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
