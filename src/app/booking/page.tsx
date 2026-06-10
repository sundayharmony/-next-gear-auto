"use client";

import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { FleetLoadingGrid } from "@/components/public/fleet-loading-grid";
import { BookingPageInner } from "@/app/booking/booking-page-inner";

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <PageContainer className="py-12">
          <FleetLoadingGrid count={3} />
        </PageContainer>
      }
    >
      <BookingPageInner />
    </Suspense>
  );
}
