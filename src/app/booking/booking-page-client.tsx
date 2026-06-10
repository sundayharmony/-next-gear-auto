"use client";

import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { FleetLoadingGrid } from "@/components/public/fleet-loading-grid";
import { BookingPageInner } from "@/app/booking/booking-page-inner";
import type { BookingLocation } from "@/app/booking/booking-constants";
import type { PublicVehicleJson } from "@/lib/vehicles/public-vehicle-fields";

export function BookingPageClient({
  initialVehicles,
  initialLocations,
}: {
  initialVehicles: PublicVehicleJson[];
  initialLocations: BookingLocation[];
}) {
  return (
    <Suspense
      fallback={
        <PageContainer className="py-12">
          <FleetLoadingGrid count={3} />
        </PageContainer>
      }
    >
      <BookingPageInner
        initialVehicles={initialVehicles}
        initialLocations={initialLocations}
      />
    </Suspense>
  );
}
