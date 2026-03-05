import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { getServiceSupabase } from "@/lib/db/supabase";
import path from "path";
import fs from "fs/promises";

// GET: Generate a pre-filled rental agreement PDF for a booking
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("bookingId");

  if (!bookingId) {
    return NextResponse.json(
      { success: false, error: "bookingId is required" },
      { status: 400 }
    );
  }

  const supabase = getServiceSupabase();

  try {
    // Fetch booking
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Fetch vehicle
    let vehicle = null;
    if (booking.vehicle_id) {
      const { data: v } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", booking.vehicle_id)
        .single();
      vehicle = v;
    }

    // Load the blank PDF template
    const templatePath = path.join(process.cwd(), "public", "templates", "rental-agreement.pdf");
    const templateBytes = await fs.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);

    // Get the form
    const form = pdfDoc.getForm();

    // Helper to safely set text field
    const setText = (fieldName: string, value: string | number | null | undefined) => {
      try {
        const field = form.getTextField(fieldName);
        field.setText(String(value ?? ""));
      } catch {
        console.warn(`Field ${fieldName} not found in PDF`);
      }
    };

    // Helper to safely check a checkbox
    const setCheck = (fieldName: string, checked: boolean) => {
      try {
        const field = form.getCheckBox(fieldName);
        if (checked) field.check();
        else field.uncheck();
      } catch {
        console.warn(`Checkbox ${fieldName} not found in PDF`);
      }
    };

    // === PAGE 1: Vehicle Information ===
    if (vehicle) {
      setText("t1", `${vehicle.make} ${vehicle.model}`); // Make & Model
      setText("t2", vehicle.year); // Year
      setText("t3", vehicle.license_plate); // License Plate
      setText("t4", vehicle.vin); // VIN
      setText("t5", vehicle.color); // Color
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
    const formatDate = (d: string) => {
      if (!d) return "";
      const date = new Date(d + "T00:00:00");
      return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    };
    const formatTime = (t: string | null) => {
      if (!t) return "";
      const [h, m] = t.split(":").map(Number);
      const ampm = h >= 12 ? "PM" : "AM";
      return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
    };

    setText("t18", formatDate(booking.pickup_date)); // Pickup Date
    setText("t19", formatTime(booking.pickup_time)); // Pickup Time
    setText("t20", formatDate(booking.return_date)); // Return Date
    setText("t21", formatTime(booking.return_time)); // Return Time

    // === Driver Info ===
    setText("t22", booking.customer_name || ""); // Primary Renter
    setText("t23", ""); // Driver's License # — to be filled by customer
    setText("t24", ""); // Additional Driver
    setText("t25", ""); // Additional Driver License

    // === Pricing ===
    const totalPrice = booking.total_price || 0;
    const deposit = booking.deposit || 0;
    const pickupDate = new Date(booking.pickup_date + "T00:00:00");
    const returnDate = new Date(booking.return_date + "T00:00:00");
    const totalDays = Math.max(1, Math.ceil((returnDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24)));

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
    console.error("Rental agreement generate error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate agreement" },
      { status: 500 }
    );
  }
}
