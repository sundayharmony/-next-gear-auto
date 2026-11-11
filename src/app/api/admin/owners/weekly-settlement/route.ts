import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { loadWeeklyOwnerSettlements } from "@/lib/owner/weekly-settlement-data";
import {
  normalizeWeekStart,
  sumOwnerWeekSettlements,
} from "@/lib/owner/weekly-settlement";
import { isYyyyMmDd } from "@/lib/utils/booking-dates";
import { logger } from "@/lib/utils/logger";

/**
 * GET /api/admin/owners/weekly-settlement?weekStart=YYYY-MM-DD&ownerId=...
 * Monday–Sunday owner payout calculator (manual pay — display only).
 */
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const weekParam = req.nextUrl.searchParams.get("weekStart");
    const ownerId = req.nextUrl.searchParams.get("ownerId")?.trim() || undefined;

    if (weekParam && !isYyyyMmDd(weekParam)) {
      return NextResponse.json(
        { success: false, message: "weekStart must be YYYY-MM-DD" },
        { status: 400 },
      );
    }

    const weekStart = weekParam ? normalizeWeekStart(weekParam) : undefined;
    const result = await loadWeeklyOwnerSettlements({ weekStart, ownerId });
    const totals = sumOwnerWeekSettlements(result.owners);

    return NextResponse.json(
      {
        success: true,
        data: {
          weekStart: result.weekStart,
          weekEnd: result.weekEnd,
          platformFeeRate: 0.25,
          ownerShareRate: 0.75,
          totals,
          owners: result.owners,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    logger.error("Weekly settlement GET error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to load weekly settlement" },
      { status: 500 },
    );
  }
}
