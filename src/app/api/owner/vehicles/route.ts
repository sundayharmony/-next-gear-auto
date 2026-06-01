import { NextRequest, NextResponse } from "next/server";
import { verifyOwner } from "@/lib/owner/owner-check";
import { loadOwnerDataset } from "@/lib/owner/owner-data";
import { logger } from "@/lib/utils/logger";

/** GET /api/owner/vehicles → the vehicles assigned to the authenticated owner. */
export async function GET(req: NextRequest) {
  const auth = await verifyOwner(req);
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
