import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";

function isValidVehicleId(id: unknown): id is string {
  if (typeof id !== "string") return false;
  const trimmed = id.trim();
  if (!trimmed) return false;
  // Support both legacy IDs (e.g. "v1", "v177...") and UUID IDs.
  return /^[A-Za-z0-9_-]{1,80}$/.test(trimmed);
}

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

    if (error) {
      logger.error("Admin vehicles GET Supabase error:", error);
      return NextResponse.json({ success: false, message: "Failed to load vehicles" }, { status: 500 });
    }

    const vehicles = (data || []).map((v) => ({
      id: v.id,
      year: v.year || 2024,
      make: v.make || "",
      model: v.model || "",
      category: v.category,
      images: v.images || [],
      specs: v.specs || {},
      dailyRate: v.daily_rate ?? 0,
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
    return NextResponse.json({ success: true, data: vehicles }, {
      headers: {
        "Cache-Control": "no-store, no-cache",
      },
    });
  } catch (error) {
    logger.error("Admin vehicles GET error:", error);
    return NextResponse.json({ success: false, message: "Failed to load vehicles" }, { status: 500 });
  }
}

// POST: Add a new vehicle
export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) return auth.response;
  const supabase = getServiceSupabase();
  try {
    const body = await request.json();

    // Server-side validation
    if (!body.make?.trim() || !body.model?.trim()) {
      return NextResponse.json({ success: false, message: "Make and Model are required" }, { status: 400 });
    }
    if (body.dailyRate !== undefined && (typeof body.dailyRate !== "number" || body.dailyRate <= 0 || !Number.isFinite(body.dailyRate))) {
      return NextResponse.json({ success: false, message: "Daily rate must be a positive number" }, { status: 400 });
    }
    if (body.year !== undefined && (typeof body.year !== "number" || body.year <= 0 || body.year < 1900 || body.year > new Date().getFullYear() + 1)) {
      return NextResponse.json({ success: false, message: "Year must be a positive number between 1900 and next year" }, { status: 400 });
    }
    if (body.purchasePrice !== undefined && (typeof body.purchasePrice !== "number" || body.purchasePrice < 0 || !Number.isFinite(body.purchasePrice))) {
      return NextResponse.json({ success: false, message: "Purchase price must be a non-negative number" }, { status: 400 });
    }
    if (body.mileage !== undefined && (typeof body.mileage !== "number" || body.mileage < 0 || !Number.isFinite(body.mileage))) {
      return NextResponse.json({ success: false, message: "Mileage must be a non-negative number" }, { status: 400 });
    }
    if (body.monthlyPayment !== undefined && (typeof body.monthlyPayment !== "number" || body.monthlyPayment < 0 || !Number.isFinite(body.monthlyPayment))) {
      return NextResponse.json({ success: false, message: "Monthly payment must be a non-negative number" }, { status: 400 });
    }
    if (body.paymentDayOfMonth !== undefined && (typeof body.paymentDayOfMonth !== "number" || body.paymentDayOfMonth < 1 || body.paymentDayOfMonth > 31)) {
      return NextResponse.json({ success: false, message: "Payment day must be between 1 and 31" }, { status: 400 });
    }

    const id = crypto.randomUUID();

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
      .maybeSingle();

    if (error) {
      logger.error("Vehicle create error:", error);
      return NextResponse.json({ success: false, message: "Failed to create vehicle" }, { status: 500 });
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

    if (!isValidVehicleId(id)) {
      return NextResponse.json({ success: false, message: "Invalid vehicle ID" }, { status: 400 });
    }

    // Server-side validation for updates
    if (updates.make !== undefined && !updates.make?.trim()) {
      return NextResponse.json({ success: false, message: "Make cannot be empty" }, { status: 400 });
    }
    if (updates.model !== undefined && !updates.model?.trim()) {
      return NextResponse.json({ success: false, message: "Model cannot be empty" }, { status: 400 });
    }
    if (updates.dailyRate !== undefined && (typeof updates.dailyRate !== "number" || updates.dailyRate <= 0 || !Number.isFinite(updates.dailyRate))) {
      return NextResponse.json({ success: false, message: "Daily rate must be a positive number" }, { status: 400 });
    }
    if (updates.year !== undefined && (typeof updates.year !== "number" || updates.year <= 0 || updates.year < 1900 || updates.year > new Date().getFullYear() + 1)) {
      return NextResponse.json({ success: false, message: "Year must be a positive number between 1900 and next year" }, { status: 400 });
    }
    if (updates.purchasePrice !== undefined && (typeof updates.purchasePrice !== "number" || updates.purchasePrice < 0 || !Number.isFinite(updates.purchasePrice))) {
      return NextResponse.json({ success: false, message: "Purchase price must be a non-negative number" }, { status: 400 });
    }
    if (updates.mileage !== undefined && (typeof updates.mileage !== "number" || updates.mileage < 0 || !Number.isFinite(updates.mileage))) {
      return NextResponse.json({ success: false, message: "Mileage must be a non-negative number" }, { status: 400 });
    }
    if (updates.monthlyPayment !== undefined && (typeof updates.monthlyPayment !== "number" || updates.monthlyPayment < 0 || !Number.isFinite(updates.monthlyPayment))) {
      return NextResponse.json({ success: false, message: "Monthly payment must be a non-negative number" }, { status: 400 });
    }
    if (updates.paymentDayOfMonth !== undefined && (typeof updates.paymentDayOfMonth !== "number" || updates.paymentDayOfMonth < 1 || updates.paymentDayOfMonth > 31)) {
      return NextResponse.json({ success: false, message: "Payment day must be between 1 and 31" }, { status: 400 });
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
      return NextResponse.json({ success: false, message: "Failed to update vehicle" }, { status: 500 });
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

    if (!isValidVehicleId(id)) {
      return NextResponse.json({ success: false, message: "Invalid vehicle ID" }, { status: 400 });
    }

    // Fetch vehicle first to get image URLs for storage cleanup
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("images")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase.from("vehicles").delete().eq("id", id);

    if (error) {
      logger.error("Vehicle delete error:", error);
      return NextResponse.json({ success: false, message: "Failed to delete vehicle" }, { status: 500 });
    }

    // Clean up images from Supabase storage after successful delete
    if (vehicle?.images && vehicle.images.length > 0) {
      try {
        const bucket = "vehicle-images";
        const filePaths = (vehicle.images as string[])
          .map((url: string) => {
            const marker = `/storage/v1/object/public/${bucket}/`;
            const idx = url.indexOf(marker);
            return idx !== -1 ? url.substring(idx + marker.length) : null;
          })
          .filter(Boolean) as string[];
        if (filePaths.length > 0) {
          await supabase.storage.from(bucket).remove(filePaths);
        }
      } catch (cleanupErr) {
        logger.error("Failed to clean up vehicle images from storage:", cleanupErr);
      }
    }

    return NextResponse.json({ success: true, message: "Vehicle deleted" });
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
}
