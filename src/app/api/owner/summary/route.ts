import { NextRequest, NextResponse } from "next/server";
import { verifyOwnerWithPortalAccess } from "@/lib/owner/owner-check";
import { loadOwnerDataset } from "@/lib/owner/owner-data";
import { computeOwnerDashboardMetrics } from "@/lib/owner/owner-metrics";
import { logger } from "@/lib/utils/logger";

/**
 * @deprecated Legacy owner endpoint. Prefer GET /api/owner/dataset (metrics slice).
 * Thin wrapper kept for backward compatibility; new portal pages should use OwnerDataProvider.
 */
export async function GET(req: NextRequest) {
  const auth = await verifyOwnerWithPortalAccess(req);
  if (!auth.authorized) return auth.response;

  try {
    const { vehicles, bookings } = await loadOwnerDataset(auth.ownerId, { ownerPortalOnly: true });
    const metrics = computeOwnerDashboardMetrics(vehicles, bookings);

    return NextResponse.json(
      { success: true, data: metrics },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    logger.error("Owner summary error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to load owner summary" },
      { status: 500 }
    );
  }
}
