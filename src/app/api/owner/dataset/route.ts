import { NextRequest, NextResponse } from "next/server";
import { verifyOwnerWithPortalAccess } from "@/lib/owner/owner-check";
import { loadOwnerDataset } from "@/lib/owner/owner-data";
import { computeOwnerDashboardMetrics } from "@/lib/owner/owner-metrics";
import { logger } from "@/lib/utils/logger";

/**
 * GET /api/owner/dataset
 * Single round-trip payload for the owner portal: dashboard metrics, bookings, and vehicles.
 */
export async function GET(req: NextRequest) {
  const auth = await verifyOwnerWithPortalAccess(req);
  if (!auth.authorized) return auth.response;

  try {
    const { vehicles, bookings, blockedDates } = await loadOwnerDataset(auth.ownerId, { ownerPortalOnly: true });
    const metrics = computeOwnerDashboardMetrics(vehicles, bookings);

    return NextResponse.json(
      {
        success: true,
        data: { metrics, bookings, vehicles, blockedDates },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    logger.error("Owner dataset error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to load owner dataset" },
      { status: 500 }
    );
  }
}
