import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";

export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("locations")
      .select("id, name, address, city, state, zip, surcharge, is_default")
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .order("name");

    if (error) {
      logger.error("Public locations fetch error:", error);
      return NextResponse.json({ success: false, error: "Failed to fetch locations" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    logger.error("Public locations API error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
