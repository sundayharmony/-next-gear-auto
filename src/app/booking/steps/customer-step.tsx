"use client";

import { Calendar, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { localMidnightFromYyyyMmDd } from "@/lib/utils/booking-dates";
import { BirthdayCalendarOverlay } from "@/app/booking/components/calendar-overlays";
import type { CustomerDetailsState } from "@/lib/booking/wizard-validation";

export interface CustomerStepProps {
  details: CustomerDetailsState;
  setDetails: React.Dispatch<React.SetStateAction<CustomerDetailsState>>;
  showDobCalendar: boolean;
  setShowDobCalendar: (open: boolean) => void;
  dobViewDate: Date;
  setDobViewDate: (date: Date) => void;
}

export function CustomerStep({
  details,
  setDetails,
  showDobCalendar,
  setShowDobCalendar,
  dobViewDate,
  setDobViewDate,
}: CustomerStepProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Your Details</h2>
        <p className="text-sm text-gray-500 mb-6">Tell us about yourself.</p>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Full Name</label>
            <Input
              placeholder="John Doe"
              maxLength={100}
              value={details.name}
              onChange={(e) => setDetails((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                maxLength={254}
                value={details.email}
                onChange={(e) => setDetails((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone</label>
              <Input
                type="tel"
                placeholder="(555) 123-4567"
                maxLength={20}
                value={details.phone}
                onChange={(e) => setDetails((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Date of Birth</label>
            <button
              type="button"
              onClick={() => {
                if (details.dob) {
                  const d = localMidnightFromYyyyMmDd(details.dob);
                  if (!isNaN(d.getTime())) {
                    setDobViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
                  }
                }
                setShowDobCalendar(true);
              }}
              className="w-full flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-sm hover:border-purple-300 hover:bg-purple-50/30 transition-all"
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-500" />
                <span className={details.dob ? "text-gray-900 font-medium" : "text-gray-400"}>
                  {details.dob
                    ? (() => {
                        const d = localMidnightFromYyyyMmDd(details.dob);
                        return isNaN(d.getTime())
                          ? "Select your birthday"
                          : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
                      })()
                    : "Select your birthday"}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </button>
            <p className="mt-1 text-xs text-gray-400">You must be at least 18 years old to rent.</p>
            <BirthdayCalendarOverlay
              isOpen={showDobCalendar}
              onClose={() => setShowDobCalendar(false)}
              onSelectDate={(date) => setDetails((p) => ({ ...p, dob: date }))}
              selectedDate={details.dob}
              dobViewDate={dobViewDate}
              setDobViewDate={setDobViewDate}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
