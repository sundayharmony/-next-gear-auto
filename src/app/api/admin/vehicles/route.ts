import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import vehiclesJson from "@/data/vehicles.json";

// GET: List all vehicles (Supabase with JSON fallback)
export async function GET() {
  const supabase = getServiceSupabase();
  try {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && data && data.length > 0) {
      // Map Supabase format to frontend format
      const vehicles = data.map((v) => ({
        id: v.id,
        name: v.name,
        category: v.category,
        images: v.images || [],
        specs: v.specs || {},
        dailyRate: v.daily_rate,
        weeklyRate: v.weekly_rate,
        monthlyRate: v.monthly_rate,
        features: v.features || [],
        isAvailable: v.is_available,
        description: v.description || "",
      }));
      return NextResponse.json({ success: true, data: vehicles, source: "supabase" });
    }
  } catch {
    // Fall through to JSON
  }

  return NextResponse.json({ success: true, data: vehiclesJson, source: "json" });
}

// POST: Add a new vehicle
export async function POST(request: NextRequest) {
  const supabase = getServiceSupabase();
  try {
    const body = await request.json();
    const id = "v" + Date.now();

    const { data, error } = await supabase
      .from("vehicles")
      .insert({
        id,
        name: body.name,
        category: body.category,
        images: body.images || [],
        specs: body.specs || { passengers: 5, luggage: 2, transmission: "Automatic", fuelType: "Gasoline", mpg: 30, doors: 4 },
        daily_rate: body.dailyRate,
        weekly_rate: body.weeklyRate,
        monthly_rate: body.monthlyRate,
        features: body.features || [],
        is_available: body.isAvailable !== false,
        description: body.description || "",
      })
      .select()
      .single();

    if (error) {
      console.error("Vehicle create error:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
}

// PUT: Update a vehicle
export async function PUT(request: NextRequest) {
  const supabase = getServiceSupabase();
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "Vehicle ID required" }, { status: 400 });
    }

    // Map frontend field names to DB column names
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.dailyRate !== undefined) dbUpdates.daily_rate = updates.dailyRate;
    if (updates.weeklyRate !== undefined) dbUpdates.weekly_rate = updates.weeklyRate;
    if (updates.monthlyRate !== undefined) dbUpdates.monthly_rate = updates.monthlyRate;
    if (updates.isAvailable !== undefined) dbUpdates.is_available = updates.isAvailable;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.features !== undefined) dbUpdates.features = updates.features;
    if (updates.specs !== undefined) dbUpdates.specs = updates.specs;
    if (updates.images !== undefined) dbUpdates.images = updates.images;

    const { error } = await supabase
      .from("vehicles")
      .update(dbUpdates)
      .eq("id", id);

    if (error) {
      console.error("Vehicle update error:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Vehicle updated" });
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
}

// DELETE: Remove a vehicle
export async function DELETE(request: NextRequest) {
  const supabase = getServiceSupabase();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "Vehicle ID required" }, { status: 400 });
    }

    const { error } = await supabase.from("vehicles").delete().eq("id", id);

    if (error) {
      console.error("Vehicle delete error:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Vehicle deleted" });
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
}
