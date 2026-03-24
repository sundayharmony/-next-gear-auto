import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";

// GET: List all vehicles from Supabase
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;
  const supabase = getServiceSupabase();
  try {
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, year, make, model, category, daily_rate, images, is_available, features, specs, mileage, license_plate, vin, maintenance_status, description, color, purchase_price, is_financed, monthly_payment, payment_day_of_month, financing_start_date, is_published, created_at")
      .order("created_at", { ascending: true });

    if (!error && data && data.length > 0) {
      const vehicles = data.map((v) => ({
        id: v.id,
        year: v.year || 2024,
        make: v.make || "",
        model: v.model || "",
        category: v.category,
        images: v.images || [],
        specs: v.specs || {},
        dailyRate: v.daily_rate,
        features: v.features || [],
        isAvailable: v.is_available,
        description: v.description || "",
        color: v.color || "",
        mileage: v.mileage ?? 0,
        licensePlate: v.license_plate || "",
        vin: v.vin || "",
        maintenanceStatus: v.maintenance_status || "good",
        purchasePrice: v.purchase_price ?? 0,
        isFinanced: v.is_financed ?? false,
        monthlyPayment: v.monthly_payment ?? 0,
        paymentDayOfMonth: v.payment_day_of_month ?? 1,
        financingStartDate: v.financing_start_date || null,
        isPublished: v.is_published !== false,
        createdAt: v.created_at || null,
      }));
      return NextResponse.json({ success: true, data: vehicles });
    }
  } catch (error) {
    logger.error("Admin vehicles GET error:", error);
  }

  // Return empty array if no vehicles found or error
  return NextResponse.json({ success: true, data: [] });
}

// POST: Add a new vehicle
export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) return auth.response;
  const supabase = getServiceSupabase();
  try {
    const body = await request.json();
    const id = "v" + Date.now();

    const { data, error } = await supabase
      .from("vehicles")
      .insert({
        id,
        year: body.year || 2024,
        make: body.make || "",
        model: body.model || "",
        category: body.category,
        images: body.images || [],
        specs: body.specs || { passengers: 5, luggage: 2, transmission: "Automatic", fuelType: "Gasoline", mpg: 30, doors: 4 },
        daily_rate: body.dailyRate,
        features: body.features || [],
        is_available: body.isAvailable !== false,
        is_published: body.isPublished !== false,
        description: body.description || "",
        color: body.color || "",
        mileage: body.mileage ?? 0,
        license_plate: body.licensePlate || "",
        vin: body.vin || "",
        maintenance_status: body.maintenanceStatus || "good",
        purchase_price: body.purchasePrice ?? 0,
        is_financed: body.isFinanced ?? false,
        monthly_payment: body.monthlyPayment ?? 0,
        payment_day_of_month: body.paymentDayOfMonth ?? 1,
        financing_start_date: body.financingStartDate || null,
      })
      .select()
      .single();

    if (error) {
      logger.error("Vehicle create error:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
}

// PUT: Update a vehicle
export async function PUT(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) return auth.response;
  const supabase = getServiceSupabase();
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "Vehicle ID required" }, { status: 400 });
    }

    const dbUpdates: Record<string, unknown> = {};
    if (updates.year !== undefined) dbUpdates.year = updates.year;
    if (updates.make !== undefined) dbUpdates.make = updates.make;
    if (updates.model !== undefined) dbUpdates.model = updates.model;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.dailyRate !== undefined) dbUpdates.daily_rate = updates.dailyRate;
    if (updates.isAvailable !== undefined) dbUpdates.is_available = updates.isAvailable;
    if (updates.isPublished !== undefined) dbUpdates.is_published = updates.isPublished;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.features !== undefined) dbUpdates.features = updates.features;
    if (updates.specs !== undefined) dbUpdates.specs = updates.specs;
    if (updates.images !== undefined) dbUpdates.images = updates.images;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.mileage !== undefined) dbUpdates.mileage = updates.mileage;
    if (updates.licensePlate !== undefined) dbUpdates.license_plate = updates.licensePlate;
    if (updates.vin !== undefined) dbUpdates.vin = updates.vin;
    if (updates.maintenanceStatus !== undefined) dbUpdates.maintenance_status = updates.maintenanceStatus;
    if (updates.purchasePrice !== undefined) dbUpdates.purchase_price = updates.purchasePrice;
    if (updates.isFinanced !== undefined) dbUpdates.is_financed = updates.isFinanced;
    if (updates.monthlyPayment !== undefined) dbUpdates.monthly_payment = updates.monthlyPayment;
    if (updates.paymentDayOfMonth !== undefined) dbUpdates.payment_day_of_month = updates.paymentDayOfMonth;
    if (updates.financingStartDate !== undefined) dbUpdates.financing_start_date = updates.financingStartDate;

    const { error } = await supabase
      .from("vehicles")
      .update(dbUpdates)
      .eq("id", id);

    if (error) {
      logger.error("Vehicle update error:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Vehicle updated" });
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
}

// DELETE: Remove a vehicle
export async function DELETE(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) return auth.response;
  const supabase = getServiceSupabase();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "Vehicle ID required" }, { status: 400 });
    }

    const { error } = await supabase.from("vehicles").delete().eq("id", id);

    if (error) {
      logger.error("Vehicle delete error:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Vehicle deleted" });
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
}
