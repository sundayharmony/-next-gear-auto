import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { getAuthFromRequest } from "@/lib/auth/jwt";
import { logger } from "@/lib/utils/logger";

// GET: List all locations (optionally filter by is_active)
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const supabase = getServiceSupabase();
    const activeOnly = request.nextUrl.searchParams.get("active") === "true";

    let query = supabase.from("locations").select("*").order("is_default", { ascending: false }).order("name");
    if (activeOnly) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) {
      logger.error("Locations fetch error:", error);
      return NextResponse.json({ success: false, message: "Failed to fetch locations" }, { status: 500 });
    }
    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    logger.error("Locations API error:", err);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

// POST: Create a new location
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { name, address, city, state, zip, surcharge, is_default, notes } = body;

    if (!name?.trim() || !address?.trim()) {
      return NextResponse.json({ success: false, message: "Name and address are required" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const id = "loc_" + crypto.randomUUID().replace(/-/g, "").slice(0, 8);

    // If this is default, unset any existing default
    if (is_default) {
      await supabase.from("locations").update({ is_default: false }).eq("is_default", true);
    }

    const { data, error } = await supabase.from("locations").insert({
      id,
      name: name.trim().slice(0, 100),
      address: address.trim().slice(0, 200),
      city: (city || "").trim().slice(0, 50),
      state: (state || "").trim().slice(0, 2),
      zip: (zip || "").trim().slice(0, 10),
      surcharge: Math.max(0, parseFloat(surcharge) || 0),
      is_default: is_default || false,
      is_active: true,
      notes: (notes || "").trim().slice(0, 500),
    }).select("*").single();

    if (error) {
      logger.error("Location create error:", error);
      return NextResponse.json({ success: false, message: "Failed to create location" }, { status: 500 });
    }
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    logger.error("Location POST error:", err);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

// PATCH: Update a location
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON" }, { status: 400 });
    }

    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ success: false, message: "Location ID is required" }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // Sanitize updates
    const clean: Record<string, unknown> = {};
    if (updates.name !== undefined) clean.name = String(updates.name).trim().slice(0, 100);
    if (updates.address !== undefined) clean.address = String(updates.address).trim().slice(0, 200);
    if (updates.city !== undefined) clean.city = String(updates.city).trim().slice(0, 50);
    if (updates.state !== undefined) clean.state = String(updates.state).trim().slice(0, 2);
    if (updates.zip !== undefined) clean.zip = String(updates.zip).trim().slice(0, 10);
    if (updates.surcharge !== undefined) clean.surcharge = Math.max(0, parseFloat(updates.surcharge) || 0);
    if (updates.is_active !== undefined) clean.is_active = Boolean(updates.is_active);
    if (updates.notes !== undefined) clean.notes = String(updates.notes).trim().slice(0, 500);
    if (updates.is_default !== undefined) {
      clean.is_default = Boolean(updates.is_default);
      if (clean.is_default) {
        await supabase.from("locations").update({ is_default: false }).eq("is_default", true);
      }
    }

    if (Object.keys(clean).length === 0) {
      return NextResponse.json({ success: false, message: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase.from("locations").update(clean).eq("id", id).select("*").single();
    if (error) {
      logger.error("Location update error:", error);
      return NextResponse.json({ success: false, message: "Failed to update location" }, { status: 500 });
    }
    return NextResponse.json({ success: true, data });
  } catch (err) {
    logger.error("Location PATCH error:", err);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Soft-delete a location (set is_active = false)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, message: "Location ID is required" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase.from("locations").update({ is_active: false }).eq("id", id);
    if (error) {
      logger.error("Location delete error:", error);
      return NextResponse.json({ success: false, message: "Failed to deactivate location" }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: "Location deactivated" });
  } catch (err) {
    logger.error("Location DELETE error:", err);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
