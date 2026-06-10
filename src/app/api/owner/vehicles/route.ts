import { NextRequest, NextResponse } from "next/server";
import { verifyOwnerWithPortalAccess } from "@/lib/owner/owner-check";
import { loadOwnerDataset } from "@/lib/owner/owner-data";
import { logger } from "@/lib/utils/logger";

/**
 * GET /api/owner/vehicles → the vehicles assigned to the authenticated owner.
 * @deprecated Legacy owner endpoint. Prefer GET /api/owner/dataset (vehicles slice).
 * Thin wrapper kept for backward compatibility; new portal pages should use OwnerDataProvider.
 */
export async function GET(req: NextRequest) {
  const auth = await verifyOwnerWithPortalAccess(req);
  if (!auth.authorized) return auth.response;

  try {
    const { vehicles } = await loadOwnerDataset(auth.ownerId);
    return NextResponse.json(
      { success: true, data: vehicles },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    logger.error("Owner vehicles error:", err);
    return NextResponse.json({ success: false, message: "Failed to load vehicles" }, { status: 500 });
  }
}
