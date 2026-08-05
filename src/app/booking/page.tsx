import type { Metadata } from "next";
import { fetchPublicVehicles } from "@/lib/vehicles/public-vehicles";
import { fetchPublicLocations } from "@/lib/locations/public-locations";
import { BookingPageClient } from "@/app/booking/booking-page-client";
import { SITE_URL } from "@/lib/constants";

/**
 * Booking performance strategy (Platform v4 Phase 11):
 * - RSC wrapper seeds vehicles + locations (same queries as GET /api/vehicles, /api/locations).
 * - BookingPageClient is the wizard island; steps 2–7 lazy-load via next/dynamic.
 * - useVehicles skips refetch when SSR seed is fresh.
 */

export const metadata: Metadata = {
  title: "Book a Car Rental in Jersey City",
  description:
    "Reserve a NextGearAuto vehicle in Jersey City, NJ. Choose dates, pick your car, and complete booking online in minutes.",
  alternates: {
    canonical: `${SITE_URL}/booking`,
  },
};

export default async function BookingPage() {
  const [initialVehicles, initialLocations] = await Promise.all([
    fetchPublicVehicles(),
    fetchPublicLocations(),
  ]);

  return (
    <BookingPageClient
      initialVehicles={initialVehicles}
      initialLocations={initialLocations}
    />
  );
}
