import { NextRequest, NextResponse } from "next/server";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { getServiceSupabase } from "@/lib/db/supabase";
import { fetchVehicleById } from "@/lib/admin/vehicle-details-queries";

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

  const supabase = getServiceSupabase();
  const vehicle = await fetchVehicleById(supabase, vehicleId, auth.role);
  if (!vehicle) {
    return NextResponse.json({ success: false, message: "Vehicle not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: vehicle }, {
    headers: { "Cache-Control": "no-store, no-cache" },
  });
}

