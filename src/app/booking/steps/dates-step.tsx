"use client";

import { Calendar, Check, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LocationMap } from "@/components/location-map";
import { cn } from "@/lib/utils/cn";
import { localMidnightFromYyyyMmDd } from "@/lib/utils/booking-dates";
import { calculateRentalHours } from "@/lib/utils/price-calculator";
import { TIME_OPTIONS, type BookingLocation } from "@/app/booking/booking-constants";
import { CalendarOverlay, formatDateForInput } from "@/app/booking/components/calendar-overlays";
import { TimePickerOverlay } from "@/app/booking/components/time-picker-overlay";
import type { SearchDatesState } from "@/lib/booking/wizard-validation";

export interface DatesStepProps {
  searchDates: SearchDatesState;
  setSearchDates: React.Dispatch<React.SetStateAction<SearchDatesState>>;
  dateValidationError: string;
  locations: BookingLocation[];
  locationsLoading: boolean;
  selectedPickupLocation: string;
  setSelectedPickupLocation: (id: string) => void;
  selectedReturnLocation: string;
  setSelectedReturnLocation: (id: string) => void;
  differentDropoff: boolean;
  setDifferentDropoff: (value: boolean) => void;
  showPickupCalendar: boolean;
  setShowPickupCalendar: (open: boolean) => void;
  showReturnCalendar: boolean;
  setShowReturnCalendar: (open: boolean) => void;
  showPickupTimePicker: boolean;
  setShowPickupTimePicker: (open: boolean) => void;
  showReturnTimePicker: boolean;
  setShowReturnTimePicker: (open: boolean) => void;
  calendarViewDate: Date;
  setCalendarViewDate: (date: Date) => void;
}

export function DatesStep({
  searchDates,
  setSearchDates,
  dateValidationError,
  locations,
  locationsLoading,
  selectedPickupLocation,
  setSelectedPickupLocation,
  selectedReturnLocation,
  setSelectedReturnLocation,
  differentDropoff,
  setDifferentDropoff,
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
}: DatesStepProps) {
  return (
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
                  setCalendarViewDate(
                    searchDates.pickup ? localMidnightFromYyyyMmDd(searchDates.pickup) : new Date(),
                  );
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
                {TIME_OPTIONS.find((opt) => opt.value === searchDates.pickupTime)?.display || "Select time"}
              </button>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Return Date</label>
              <button
                onClick={() => {
                  setCalendarViewDate(
                    searchDates.return ? localMidnightFromYyyyMmDd(searchDates.return) : new Date(),
                  );
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
                {TIME_OPTIONS.find((opt) => opt.value === searchDates.returnTime)?.display || "Select time"}
              </button>
            </div>
          </div>
          {dateValidationError && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {dateValidationError}
            </div>
          )}
          {searchDates.pickup && searchDates.return && !dateValidationError && (
            <div className="mt-4 rounded-lg bg-purple-50 p-3 text-sm text-purple-700">
              <Calendar className="inline h-4 w-4 mr-1" />
              {(() => {
                const hours = calculateRentalHours(
                  searchDates.pickup,
                  searchDates.return,
                  searchDates.pickupTime,
                  searchDates.returnTime,
                );
                return `${hours} hour${hours > 1 ? "s" : ""} rental`;
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {!locationsLoading && locations.length > 0 && locations.some((l) => l.lat && l.lng) && (
        <LocationMap
          locations={locations}
          selectedId={selectedPickupLocation}
          onSelect={(id) => {
            setSelectedPickupLocation(id);
            if (!differentDropoff) setSelectedReturnLocation(id);
          }}
          className="h-[280px] mt-6 mb-4"
        />
      )}

      {!locationsLoading && locations.length > 0 && (
        <div className="mt-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-purple-600" />
            Pickup Location
          </h3>
          <div className="grid gap-2">
            {locations.map((loc) => (
              <label
                key={loc.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  selectedPickupLocation === loc.id
                    ? "border-purple-500 bg-purple-50 ring-1 ring-purple-500"
                    : "border-gray-200 hover:border-purple-300"
                )}
              >
                <input
                  type="radio"
                  name="pickupLocation"
                  value={loc.id}
                  checked={selectedPickupLocation === loc.id}
                  onChange={() => {
                    setSelectedPickupLocation(loc.id);
                    if (!differentDropoff) setSelectedReturnLocation(loc.id);
                  }}
                  className="sr-only"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm">{loc.name}</span>
                    {loc.is_default && (
                      <Badge className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0">Main</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {loc.address}{loc.city ? `, ${loc.city}` : ""}{loc.state ? ` ${loc.state}` : ""}
                  </p>
                </div>
                {loc.surcharge > 0 && (
                  <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                    +${loc.surcharge.toFixed(2)}
                  </span>
                )}
                {selectedPickupLocation === loc.id && <Check className="w-4 h-4 text-purple-600 shrink-0" />}
              </label>
            ))}
          </div>

          <label className="flex items-center gap-2 cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={differentDropoff}
              onChange={(e) => {
                setDifferentDropoff(e.target.checked);
                if (!e.target.checked) setSelectedReturnLocation(selectedPickupLocation);
              }}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-600">Different dropoff location</span>
          </label>

          {differentDropoff && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-500" />
                Dropoff Location
              </h3>
              <div className="grid gap-2">
                {locations.map((loc) => (
                  <label
                    key={loc.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      selectedReturnLocation === loc.id
                        ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500"
                        : "border-gray-200 hover:border-orange-300"
                    )}
                  >
                    <input
                      type="radio"
                      name="returnLocation"
                      value={loc.id}
                      checked={selectedReturnLocation === loc.id}
                      onChange={() => setSelectedReturnLocation(loc.id)}
                      className="sr-only"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm">{loc.name}</span>
                        {loc.is_default && (
                          <Badge className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0">Main</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {loc.address}{loc.city ? `, ${loc.city}` : ""}{loc.state ? ` ${loc.state}` : ""}
                      </p>
                    </div>
                    {loc.surcharge > 0 && (
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                        +${loc.surcharge.toFixed(2)}
                      </span>
                    )}
                    {selectedReturnLocation === loc.id && <Check className="w-4 h-4 text-orange-600 shrink-0" />}
                  </label>
                ))}
              </div>
            </div>
          )}

          {(() => {
            const pickupLoc = locations.find((l) => l.id === selectedPickupLocation);
            const returnLoc = differentDropoff ? locations.find((l) => l.id === selectedReturnLocation) : pickupLoc;
            const totalSurcharge =
              (pickupLoc?.surcharge || 0) + (differentDropoff && returnLoc ? returnLoc.surcharge || 0 : 0);
            if (totalSurcharge > 0) {
              return (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                  <span className="font-medium text-amber-800">Location surcharge: </span>
                  <span className="text-amber-900 font-bold">${totalSurcharge.toFixed(2)}</span>
                  <span className="text-amber-600 ml-1">(added to total)</span>
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}

      <CalendarOverlay
        isOpen={showPickupCalendar}
        onClose={() => setShowPickupCalendar(false)}
        onSelectDate={(date) => setSearchDates((p) => ({ ...p, pickup: date }))}
        isPickup
        searchDates={searchDates}
        calendarViewDate={calendarViewDate}
        setCalendarViewDate={setCalendarViewDate}
      />
      <CalendarOverlay
        isOpen={showReturnCalendar}
        onClose={() => setShowReturnCalendar(false)}
        onSelectDate={(date) => setSearchDates((p) => ({ ...p, return: date }))}
        isPickup={false}
        searchDates={searchDates}
        calendarViewDate={calendarViewDate}
        setCalendarViewDate={setCalendarViewDate}
      />
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
  );
}
