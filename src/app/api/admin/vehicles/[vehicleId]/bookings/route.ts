import { NextRequest, NextResponse } from "next/server";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { getServiceSupabase } from "@/lib/db/supabase";
import { fetchBookingsByVehicle } from "@/lib/admin/vehicle-details-queries";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;

  const { vehicleId } = await params;
  if (!vehicleId) {
    return NextResponse.json({ success: false, message: "vehicleId is required" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 25);

  const supabase = getServiceSupabase();
  const result = await fetchBookingsByVehicle(supabase, vehicleId, auth.role, auth.userId, {
    status: searchParams.get("status"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
    page,
    limit,
  });

  return NextResponse.json({ success: true, ...result }, {
    headers: { "Cache-Control": "no-store, no-cache" },
  });
}

