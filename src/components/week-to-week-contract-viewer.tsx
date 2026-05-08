"use client";

import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RentalAgreementInline } from "@/components/rental-agreement-inline";

interface WeekToWeekContractViewerProps {
  weeklyPrice?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export function WeekToWeekContractViewer({
  weeklyPrice = 0,
  customerName,
  customerEmail,
  customerPhone,
}: WeekToWeekContractViewerProps) {
  const [page, setPage] = React.useState(1);

  return (
    <div>
      <RentalAgreementInline
        agreementType="weeklyRecurring"
        customerName={customerName}
        customerEmail={customerEmail}
        customerPhone={customerPhone}
        totalPrice={weeklyPrice}
        totalDays={7}
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
