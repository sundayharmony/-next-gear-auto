import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { getServiceSupabase } from "@/lib/db/supabase";
import { fmtTime } from "@/lib/email/templates";
import path from "path";
import fs from "fs/promises";
import { logger } from "@/lib/utils/logger";

// GET: Generate a pre-filled rental agreement PDF
// Supports two modes:
//   1. ?bookingId=xxx — fetches data from an existing booking
//   2. ?vehicleId=xxx&pickupDate=...&returnDate=...&customerName=... — for pre-booking preview
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("bookingId");
  const vehicleId = searchParams.get("vehicleId");

  if (!bookingId && !vehicleId) {
    return NextResponse.json(
      { success: false, error: "bookingId or vehicleId is required" },
      { status: 400 }
    );
  }

  const supabase = getServiceSupabase();

  try {
    // For preview mode, require admin auth
    if (!bookingId && vehicleId) {
      const { verifyAdmin } = await import("@/lib/auth/admin-check");
      const auth = await verifyAdmin(req);
      if (!auth.authorized) return auth.response;
    }

    let booking: {
      customer_name?: string;
      customer_email?: string;
      customer_phone?: string;
      pickup_date: string;
      return_date: string;
      pickup_time?: string | null;
      return_time?: string | null;
      total_price: number;
      deposit: number;
      vehicle_id?: string;
    } | null = null;
    let vehicle: {
      make?: string;
      model?: string;
      year?: number;
      license_plate?: string;
      vin?: string;
      color?: string;
      mileage?: number;
    } | null = null;

    if (bookingId) {
      // Mode 1: Existing booking
      const { data: b, error: bookingErr } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .maybeSingle();

      if (bookingErr || !b) {
        return NextResponse.json(
          { success: false, error: "Booking not found" },
          { status: 404 }
        );
      }
      booking = b;

      // Verify requester: check email param or admin auth
      const requesterEmail = searchParams.get("email")?.toLowerCase().trim();
      if (requesterEmail) {
        if (b.customer_email && requesterEmail !== b.customer_email.toLowerCase().trim()) {
          return NextResponse.json({ success: false, error: "Not authorized to view this agreement" }, { status: 403 });
        }
      } else {
        // No email provided - require admin auth
        const { verifyAdmin } = await import("@/lib/auth/admin-check");
        const auth = await verifyAdmin(req);
        if (!auth.authorized) return auth.response;
      }

      if (booking && booking.vehicle_id) {
        const { data: v } = await supabase
          .from("vehicles")
          .select("*")
          .eq("id", booking.vehicle_id)
          .maybeSingle();
        vehicle = v;
      }
    } else {
      // Mode 2: Pre-booking preview with query params
      if (vehicleId) {
        const { data: v } = await supabase
          .from("vehicles")
          .select("*")
          .eq("id", vehicleId)
          .maybeSingle();
        vehicle = v;
      }

      // Build a mock booking object from query params
      const pickupDate = searchParams.get("pickupDate") || "";
      const returnDate = searchParams.get("returnDate") || "";

      // Validate date format (Bug 27)
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (pickupDate && !isoDateRegex.test(pickupDate)) {
        return NextResponse.json(
          { success: false, error: "Invalid pickup_date format. Must be ISO date (YYYY-MM-DD)" },
          { status: 400 }
        );
      }
      if (returnDate && !isoDateRegex.test(returnDate)) {
        return NextResponse.json(
          { success: false, error: "Invalid return_date format. Must be ISO date (YYYY-MM-DD)" },
          { status: 400 }
        );
      }

      booking = {
        customer_name: searchParams.get("customerName") || "",
        customer_email: searchParams.get("customerEmail") || "",
        customer_phone: searchParams.get("customerPhone") || "",
        pickup_date: pickupDate,
        return_date: returnDate,
        pickup_time: searchParams.get("pickupTime") || null,
        return_time: searchParams.get("returnTime") || null,
        total_price: Number.isFinite(parseFloat(searchParams.get("totalPrice") || "0")) ? parseFloat(searchParams.get("totalPrice") || "0") : 0,
        deposit: Number.isFinite(parseFloat(searchParams.get("deposit") || "0")) ? parseFloat(searchParams.get("deposit") || "0") : 0,
        vehicle_id: vehicleId || "",
      };
    }

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking data could not be resolved" },
        { status: 400 }
      );
    }

    // Load the blank PDF template
    const templatePath = path.join(process.cwd(), "public", "templates", "rental-agreement.pdf");
    let templateBytes: Buffer;
    try {
      templateBytes = await fs.readFile(templatePath);
    } catch (fileError) {
      logger.error("PDF template file not found:", templatePath);
      return NextResponse.json(
        { success: false, error: "Rental agreement template not found. Please contact support." },
        { status: 500 }
      );
    }
    const pdfDoc = await PDFDocument.load(templateBytes);

    // Get the form
    const form = pdfDoc.getForm();

    // Helper to safely set text field
    const setText = (fieldName: string, value: string | number | null | undefined) => {
      try {
        const field = form.getTextField(fieldName);
        field.setText(String(value ?? ""));
      } catch {
        logger.warn(`Field ${fieldName} not found in PDF`);
      }
    };

    // Helper to safely check a checkbox
    const setCheck = (fieldName: string, checked: boolean) => {
      try {
        const field = form.getCheckBox(fieldName);
        if (checked) field.check();
        else field.uncheck();
      } catch {
        logger.warn(`Checkbox ${fieldName} not found in PDF`);
      }
    };

    // === PAGE 1: Vehicle Information ===
    if (vehicle) {
      setText("t1", `${vehicle.make || ""} ${vehicle.model || ""}`.trim()); // Make & Model
      setText("t2", vehicle.year ?? ""); // Year
      setText("t3", vehicle.license_plate ?? ""); // License Plate
      setText("t4", vehicle.vin ?? ""); // VIN
      setText("t5", vehicle.color ?? ""); // Color
      setText("t6", vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString()} mi` : ""); // Mileage

      // Condition checkboxes — default to "Good"
      setCheck("c7", false); // Excellent
      setCheck("c8", true);  // Good
      setCheck("c9", false); // Fair
      setCheck("c10", false); // Poor
    }

    // t11: Damage notes (leave blank for inspection at pickup)
    setText("t11", "");

    // === Customer Information ===
    setText("t12", booking.customer_name || ""); // Full Name
    // t13: DOB — we don't store this on the booking, leave blank for customer
    setText("t13", "");
    // t14-t15: Address — not stored on booking
    setText("t14", "");
    setText("t15", "");
    setText("t16", booking.customer_phone || ""); // Phone
    setText("t17", booking.customer_email || ""); // Email

    // === Rental Dates & Times ===
    const pdfDate = (d: string) => {
      if (!d) return "";
      const parts = d.split("-");
      if (parts.length !== 3) return "";
      const [y, m, day] = parts.map(Number);
      if (isNaN(y) || isNaN(m) || isNaN(day)) return "";
      const date = new Date(y, m - 1, day);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    };

    setText("t18", pdfDate(booking.pickup_date)); // Pickup Date
    setText("t19", fmtTime(booking.pickup_time)); // Pickup Time
    setText("t20", pdfDate(booking.return_date)); // Return Date
    setText("t21", fmtTime(booking.return_time)); // Return Time

    // === Driver Info ===
    setText("t22", booking.customer_name || ""); // Primary Renter
    setText("t23", ""); // Driver's License # — to be filled by customer
    setText("t24", ""); // Additional Driver
    setText("t25", ""); // Additional Driver License

    // === Pricing ===
    const totalPrice = booking.total_price ?? 0;
    const deposit = booking.deposit ?? 0;
    const pickupDate = booking.pickup_date ? new Date(booking.pickup_date + "T00:00:00") : new Date();
    const returnDate = booking.return_date ? new Date(booking.return_date + "T00:00:00") : new Date();
    const daysDiff = (returnDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24);
    const totalDays = Math.max(1, Math.ceil(Number.isFinite(daysDiff) ? daysDiff : 1));

    setText("t26", `$${totalPrice.toFixed(2)}`); // Total Price
    setText("t27", String(totalDays)); // Total Days
    setText("t28", `$${(totalPrice - deposit).toFixed(2)}`); // Balance Due

    // === Payment Method ===
    // Since payment is via Stripe (credit/debit), check c31
    setCheck("c29", false); // Cash
    setCheck("c30", false); // Zelle
    setCheck("c31", true);  // Credit/Debit
    setText("t32", ""); // Last 4 — we can fill from Stripe if available
    setCheck("c33", false); // Other
    setText("t34", ""); // Other text

    // t35: Renter Initials — SIGNATURE FIELD (leave for digital signing)
    setText("t35", "");
    // t36: Date (will be filled at signing time)
    setText("t36", "");

    // === PAGE 2: Insurance & GPS ===
    setText("t37", ""); // Insurance Provider — customer fills
    setText("t38", ""); // Policy #
    setText("t39", ""); // Insurance Phone
    setCheck("c40", false); // Accept SLP
    setCheck("c41", false); // GPS consent
    setText("t42", ""); // GPS Initials — SIGNATURE FIELD
    setText("t43", ""); // Renter Initials — SIGNATURE FIELD
    setText("t44", ""); // Date

    // === PAGE 3: Signatures ===
    setText("t45", booking.customer_name || ""); // Renter Name (Print)
    setText("t46", ""); // Date — filled at signing
    setText("t47", ""); // Renter Signature — SIGNATURE FIELD
    setText("t48", ""); // Time
    setText("t49", ""); // Additional Driver (Print)
    setText("t50", ""); // Date
    setText("t51", ""); // Additional Driver Signature — SIGNATURE FIELD
    setText("t52", ""); // Time
    setText("t53", "NextGear Auto"); // NGA Representative
    setText("t54", ""); // Date
    setText("t55", ""); // Rep Signature — SIGNATURE FIELD
    setText("t56", ""); // Time
    setText("t57", ""); // Renter Initials — SIGNATURE FIELD
    setText("t58", ""); // Date

    // Flatten non-signature fields so they display nicely but keep signature fields editable
    // Actually, we want to keep all fields for now since signatures will be embedded as images

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="rental-agreement-${bookingId}.pdf"`,
      },
    });
  } catch (error) {
    logger.error("Rental agreement generate error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate agreement" },
      { status: 500 }
    );
  }
}
