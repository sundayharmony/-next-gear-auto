import { NextRequest, NextResponse } from "next/server";
import { verifyOwnerWithPortalAccess } from "@/lib/owner/owner-check";
import { loadOwnerDataset } from "@/lib/owner/owner-data";
import { computeOwnerFinanceSummary } from "@/lib/owner/owner-metrics";
import { logger } from "@/lib/utils/logger";

export async function GET(req: NextRequest) {
  const auth = await verifyOwnerWithPortalAccess(req);
  if (!auth.authorized) return auth.response;

  try {
    const { vehicles, bookings } = await loadOwnerDataset(auth.ownerId, { ownerPortalOnly: true });
    const summary = computeOwnerFinanceSummary(bookings, vehicles);

    return NextResponse.json(
      {
        success: true,
        data: {
          summary,
          vehicles,
          bookings,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    logger.error("Owner finance error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to load finance data" },
      { status: 500 }
    );
  }
}
