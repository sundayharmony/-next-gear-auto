import { Suspense } from "react";
import { fetchPublicVehicles } from "@/lib/vehicles/public-vehicles";
import { FleetClient } from "./fleet-client";

/**
 * Fleet performance strategy (Platform v3 Phase 7):
 * - Server Component wrapper fetches published vehicles via Supabase (same query as GET /api/vehicles).
 * - Hero + vehicle grid first paint use SSR data — no client-only loading flash when DB has rows.
 * - FleetClient is the "filter island": search, category pills, sort, compare, and mobile drawer stay client-side.
 * - useVehicles() still runs for shared cache / retry; SSR seed avoids empty initial render.
 * - Vehicle detail pages (/fleet/[id]) were already RSC; list page now matches that pattern.
 */

export default async function FleetPage() {
  const initialVehicles = await fetchPublicVehicles();

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24" role="status" aria-label="Loading fleet page">
          <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full" aria-hidden="true" />
        </div>
      }
    >
      <FleetClient initialVehicles={initialVehicles} />
    </Suspense>
  );
}
