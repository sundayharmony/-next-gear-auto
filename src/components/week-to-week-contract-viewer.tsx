"use client";

import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RentalAgreementInline } from "@/components/rental-agreement-inline";

interface WeekToWeekContractViewerProps {
  vehicle?: {
    make: string;
    model: string;
    year: number;
    licensePlate?: string;
    vin?: string;
    color?: string;
    mileage?: number;
  } | null;
  weeklyPrice?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  pickupDate?: string;
  returnDate?: string;
  pickupTime?: string | null;
  returnTime?: string | null;
  weeklyDueDay?: string;
}

export function WeekToWeekContractViewer({
  vehicle,
  weeklyPrice = 0,
  customerName,
  customerEmail,
  customerPhone,
  pickupDate,
  returnDate,
  pickupTime,
  returnTime,
  weeklyDueDay,
}: WeekToWeekContractViewerProps) {
  const [page, setPage] = React.useState(1);

  return (
    <div>
      <RentalAgreementInline
        agreementType="weeklyRecurring"
        vehicle={vehicle}
        customerName={customerName}
        customerEmail={customerEmail}
        customerPhone={customerPhone}
        pickupDate={pickupDate}
        returnDate={returnDate}
        pickupTime={pickupTime ?? undefined}
        returnTime={returnTime ?? undefined}
        totalPrice={weeklyPrice}
        totalDays={7}
        weeklyDueDay={weeklyDueDay}
        currentPage={page}
      />

      <div className="mt-4 flex items-center justify-between">
        <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Previous
        </Button>

        <p className="text-sm text-gray-500">Page {page} of 3</p>

        <Button onClick={() => setPage((p) => Math.min(3, p + 1))} disabled={page === 3}>
          Next <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
