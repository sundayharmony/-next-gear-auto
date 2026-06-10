import { fetchPublicVehicles } from "@/lib/vehicles/public-vehicles";
import { fetchPublicLocations } from "@/lib/locations/public-locations";
import { BookingPageClient } from "@/app/booking/booking-page-client";

/**
 * Booking performance strategy (Platform v4 Phase 11):
 * - RSC wrapper seeds vehicles + locations (same queries as GET /api/vehicles, /api/locations).
 * - BookingPageClient is the wizard island; steps 2–7 lazy-load via next/dynamic.
 * - useVehicles skips refetch when SSR seed is fresh.
 */

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
