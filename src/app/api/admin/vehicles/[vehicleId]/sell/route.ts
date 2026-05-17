import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { getServiceSupabase } from "@/lib/db/supabase";
import { generateBillOfSalePdf } from "@/lib/vehicle-sale/bill-of-sale-pdf";
import { hasBlockingBookingsForSale } from "@/lib/vehicle-sale/guards";
import type { SellVehicleRequestBody, VehicleSaleRecord } from "@/lib/vehicle-sale/types";
import { logger } from "@/lib/utils/logger";
import { isYyyyMmDd } from "@/lib/utils/booking-dates";

const BUCKET = "vehicle-sales";
const SIGNED_URL_TTL_SEC = 3600;

function mapSaleRow(row: Record<string, unknown>): VehicleSaleRecord {
  return {
    id: String(row.id),
    vehicleId: String(row.vehicle_id),
    saleDate: String(row.sale_date),
    salePrice: Number(row.sale_price),
    buyerName: String(row.buyer_name),
    buyerAddress: String(row.buyer_address),
    buyerPhone: row.buyer_phone != null ? String(row.buyer_phone) : null,
    buyerEmail: row.buyer_email != null ? String(row.buyer_email) : null,
    odometer: row.odometer != null ? Number(row.odometer) : null,
    paymentMethod: row.payment_method != null ? String(row.payment_method) : null,
    notes: row.notes != null ? String(row.notes) : null,
    createdAt: String(row.created_at),
  };
}

async function signedPdfUrl(supabase: ReturnType<typeof getServiceSupabase>, pdfPath: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(pdfPath, SIGNED_URL_TTL_SEC);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> },
) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  const { vehicleId } = await params;
  if (!vehicleId) {
    return NextResponse.json({ success: false, message: "vehicleId is required" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data: row, error } = await supabase
    .from("vehicle_sales")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .maybeSingle();

  if (error) {
    logger.error("vehicle_sales GET error:", error);
    return NextResponse.json({ success: false, message: "Failed to load sale" }, { status: 500 });
  }

  if (!row) {
    return NextResponse.json({ success: true, data: null }, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const sale = mapSaleRow(row as Record<string, unknown>);
  const pdfDownloadUrl = await signedPdfUrl(supabase, String(row.pdf_path));

  return NextResponse.json({
    success: true,
    data: { ...sale, pdfDownloadUrl },
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}

function validateSellBody(body: unknown): { ok: true; data: SellVehicleRequestBody } | { ok: false; message: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Invalid request body" };
  }
  const b = body as Record<string, unknown>;
  const buyerName = typeof b.buyerName === "string" ? b.buyerName.trim() : "";
  const buyerAddress = typeof b.buyerAddress === "string" ? b.buyerAddress.trim() : "";
  const saleDate = typeof b.saleDate === "string" ? b.saleDate.trim() : "";
  const salePrice = typeof b.salePrice === "number" ? b.salePrice : parseFloat(String(b.salePrice ?? ""));

  if (!buyerName) return { ok: false, message: "buyerName is required" };
  if (!buyerAddress) return { ok: false, message: "buyerAddress is required" };
  if (!saleDate || !isYyyyMmDd(saleDate)) {
    return { ok: false, message: "saleDate must be YYYY-MM-DD" };
  }
  if (!Number.isFinite(salePrice) || salePrice <= 0) {
    return { ok: false, message: "salePrice must be a positive number" };
  }

  let odometer: number | undefined;
  if (b.odometer !== undefined && b.odometer !== null && b.odometer !== "") {
    odometer = typeof b.odometer === "number" ? b.odometer : parseInt(String(b.odometer), 10);
    if (!Number.isFinite(odometer) || odometer < 0) {
      return { ok: false, message: "odometer must be a non-negative number" };
    }
  }

  return {
    ok: true,
    data: {
      buyerName,
      buyerAddress,
      buyerPhone: typeof b.buyerPhone === "string" ? b.buyerPhone.trim() : undefined,
      buyerEmail: typeof b.buyerEmail === "string" ? b.buyerEmail.trim() : undefined,
      saleDate,
      salePrice,
      odometer,
      paymentMethod: typeof b.paymentMethod === "string" ? b.paymentMethod.trim() : undefined,
      notes: typeof b.notes === "string" ? b.notes.trim() : undefined,
    },
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> },
) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  const { vehicleId } = await params;
  if (!vehicleId) {
    return NextResponse.json({ success: false, message: "vehicleId is required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = validateSellBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ success: false, message: parsed.message }, { status: 400 });
  }
  const input = parsed.data;

  const supabase = getServiceSupabase();

  const { data: existingSale } = await supabase
    .from("vehicle_sales")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .maybeSingle();

  if (existingSale) {
    return NextResponse.json(
      { success: false, message: "This vehicle has already been sold" },
      { status: 409 },
    );
  }

  const { data: vehicle, error: vehicleErr } = await supabase
    .from("vehicles")
    .select("id, year, make, model, category, vin, license_plate, color, mileage")
    .eq("id", vehicleId)
    .maybeSingle();

  if (vehicleErr || !vehicle) {
    return NextResponse.json({ success: false, message: "Vehicle not found" }, { status: 404 });
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const { data: openBookings, error: bookingsErr } = await supabase
    .from("bookings")
    .select("id, status, return_date")
    .eq("vehicle_id", vehicleId)
    .in("status", ["pending", "confirmed", "active"]);

  if (bookingsErr) {
    logger.error("Sell vehicle bookings check error:", bookingsErr);
    return NextResponse.json({ success: false, message: "Failed to verify bookings" }, { status: 500 });
  }

  if (hasBlockingBookingsForSale(openBookings || [], todayStr)) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Cannot sell: this vehicle has open bookings (pending, confirmed, or active). Complete or cancel them first.",
      },
      { status: 409 },
    );
  }

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateBillOfSalePdf({
      buyerName: input.buyerName,
      buyerAddress: input.buyerAddress,
      buyerPhone: input.buyerPhone,
      buyerEmail: input.buyerEmail,
      saleDate: input.saleDate,
      salePrice: input.salePrice,
      paymentMethod: input.paymentMethod,
      notes: input.notes,
      odometer: input.odometer ?? (vehicle.mileage != null ? Number(vehicle.mileage) : null),
      vehicle: {
        year: Number(vehicle.year),
        make: String(vehicle.make || ""),
        model: String(vehicle.model || ""),
        category: vehicle.category as string | null,
        vin: vehicle.vin as string | null,
        license_plate: vehicle.license_plate as string | null,
        color: vehicle.color as string | null,
        mileage: vehicle.mileage != null ? Number(vehicle.mileage) : null,
      },
    });
  } catch (e) {
    logger.error("Bill of sale PDF generation failed:", e);
    const msg = e instanceof Error ? e.message : "Failed to generate bill of sale PDF";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }

  const saleId = crypto.randomUUID();
  const pdfPath = `${vehicleId}/${saleId}.pdf`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(pdfPath, Buffer.from(pdfBytes), {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadErr) {
    if (
      uploadErr.message?.includes("not found") ||
      uploadErr.message?.includes("Bucket") ||
      (uploadErr as { statusCode?: number }).statusCode === 404
    ) {
      try {
        await supabase.storage.createBucket(BUCKET, { public: false, fileSizeLimit: 10485760 });
      } catch {
        /* may exist */
      }
      const { error: retryErr } = await supabase.storage
        .from(BUCKET)
        .upload(pdfPath, Buffer.from(pdfBytes), { contentType: "application/pdf", upsert: false });
      if (retryErr) {
        logger.error("vehicle-sales upload retry failed:", retryErr);
        return NextResponse.json({ success: false, message: "Failed to store bill of sale PDF" }, { status: 500 });
      }
    } else {
      logger.error("vehicle-sales upload failed:", uploadErr);
      return NextResponse.json({ success: false, message: "Failed to store bill of sale PDF" }, { status: 500 });
    }
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("vehicle_sales")
    .insert({
      id: saleId,
      vehicle_id: vehicleId,
      sale_date: input.saleDate,
      sale_price: input.salePrice,
      buyer_name: input.buyerName,
      buyer_address: input.buyerAddress,
      buyer_phone: input.buyerPhone || null,
      buyer_email: input.buyerEmail || null,
      odometer: input.odometer ?? (vehicle.mileage != null ? Number(vehicle.mileage) : null),
      payment_method: input.paymentMethod || null,
      notes: input.notes || null,
      pdf_path: pdfPath,
      created_by_admin_id: auth.adminId,
    })
    .select("*")
    .single();

  if (insertErr || !inserted) {
    logger.error("vehicle_sales insert error:", insertErr);
    await supabase.storage.from(BUCKET).remove([pdfPath]).catch(() => {});
    return NextResponse.json({ success: false, message: "Failed to record sale" }, { status: 500 });
  }

  const { error: updateErr } = await supabase
    .from("vehicles")
    .update({ is_available: false, is_published: false })
    .eq("id", vehicleId);

  if (updateErr) {
    logger.error("Vehicle unlist after sale failed:", updateErr);
    return NextResponse.json(
      { success: false, message: "Sale recorded but failed to unpublish vehicle. Update manually." },
      { status: 500 },
    );
  }

  const sale = mapSaleRow(inserted as Record<string, unknown>);
  const pdfDownloadUrl = await signedPdfUrl(supabase, pdfPath);

  return NextResponse.json(
    {
      success: true,
      data: { ...sale, pdfDownloadUrl },
    },
    { status: 201 },
  );
}
