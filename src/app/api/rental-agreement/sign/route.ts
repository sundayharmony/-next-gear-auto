import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { getServiceSupabase } from "@/lib/db/supabase";
import { sendAgreementEmail } from "@/lib/email/mailer";
import { fmtTime } from "@/lib/email/templates";
import path from "path";
import fs from "fs/promises";

interface SignatureData {
  t35?: string; // Renter Initials (Page 1)
  t42?: string; // GPS Initials (Page 2)
  t43?: string; // Renter Initials (Page 2)
  t47?: string; // Renter Signature (Page 3)
  t51?: string; // Additional Driver Signature (Page 3)
  t55?: string; // NGA Rep Signature (Page 3)
  t57?: string; // Renter Initials (Page 3)
}

// Field positions (approximate centers and sizes for embedding signature images)
// These are in PDF coordinate space (0,0 = bottom-left)
const SIGNATURE_FIELDS: Record<
  string,
  { page: number; x: number; y: number; width: number; height: number; isInitials: boolean }
> = {
  // Coordinates from PDF field rects (PDF coordinates: 0,0 = bottom-left)
  t35: { page: 0, x: 418, y: 34, width: 50, height: 14, isInitials: true },
  t42: { page: 1, x: 105.5, y: 243, width: 70, height: 16, isInitials: true },
  t43: { page: 1, x: 418, y: 34, width: 50, height: 14, isInitials: true },
  t47: { page: 2, x: 128.5, y: 369, width: 230, height: 16, isInitials: false },
  t51: { page: 2, x: 167.5, y: 317, width: 230, height: 16, isInitials: false },
  t55: { page: 2, x: 162, y: 265, width: 230, height: 16, isInitials: false },
  t57: { page: 2, x: 418, y: 34, width: 50, height: 14, isInitials: true },
};

export async function POST(req: NextRequest) {
  const supabase = getServiceSupabase();

  try {
    const body = await req.json();
    const { bookingId, signatures } = body as {
      bookingId: string;
      signatures: SignatureData;
    };

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "bookingId is required" },
        { status: 400 }
      );
    }

    if (!signatures || Object.keys(signatures).length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one signature is required" },
        { status: 400 }
      );
    }

    // Validate signature data format — each value must be a valid base64 PNG
    for (const [key, value] of Object.entries(signatures)) {
      if (value && typeof value === "string") {
        const cleaned = (value as string).replace(/^data:image\/png;base64,/, "");
        // Check it's valid base64 and not excessively large (max 500KB per signature)
        if (cleaned.length > 500 * 1024) {
          return NextResponse.json(
            { success: false, error: `Signature ${key} exceeds maximum size` },
            { status: 400 }
          );
        }
        try {
          Buffer.from(cleaned, "base64");
        } catch {
          return NextResponse.json(
            { success: false, error: `Invalid signature data for ${key}` },
            { status: 400 }
          );
        }
      }
    }

    // Fetch booking to verify it exists
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

    // Verify booking hasn't already been signed
    if (booking.agreement_signed_at) {
      return NextResponse.json(
        { success: false, error: "This agreement has already been signed" },
        { status: 409 }
      );
    }

    // Verify booking is in a valid state for signing (confirmed or active)
    const validStatuses = ["confirmed", "active", "pending"];
    if (booking.status && !validStatuses.includes(booking.status)) {
      return NextResponse.json(
        { success: false, error: "This booking is not in a valid state for signing" },
        { status: 400 }
      );
    }

    // Fetch vehicle info
    let vehicle: {
      make?: string;
      model?: string;
      year?: number;
      license_plate?: string;
      vin?: string;
      color?: string;
      mileage?: number;
    } | null = null;
    if (booking.vehicle_id) {
      const { data: v } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", booking.vehicle_id)
        .single();
      vehicle = v;
    }

    // Load blank template and fill it (same as generate)
    const templatePath = path.join(process.cwd(), "public", "templates", "rental-agreement.pdf");
    const templateBytes = await fs.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    const setText = (fieldName: string, value: string | number | null | undefined) => {
      try {
        const field = form.getTextField(fieldName);
        field.setText(String(value ?? ""));
      } catch {
        // Field not found
      }
    };

    const setCheck = (fieldName: string, checked: boolean) => {
      try {
        const field = form.getCheckBox(fieldName);
        if (checked) field.check();
        else field.uncheck();
      } catch {
        // Checkbox not found
      }
    };

    // Fill all auto-fill fields (same logic as generate)
    if (vehicle) {
      setText("t1", `${vehicle.make} ${vehicle.model}`);
      setText("t2", vehicle.year);
      setText("t3", vehicle.license_plate);
      setText("t4", vehicle.vin);
      setText("t5", vehicle.color);
      setText("t6", vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString()} mi` : "");
      setCheck("c7", false);
      setCheck("c8", true);
      setCheck("c9", false);
      setCheck("c10", false);
    }

    setText("t11", "");
    setText("t12", booking.customer_name || "");
    setText("t13", "");
    setText("t14", "");
    setText("t15", "");
    setText("t16", booking.customer_phone || "");
    setText("t17", booking.customer_email || "");

    // Compact MM/DD/YYYY formatter for PDF form fields
    const pdfDate = (d: string) => {
      if (!d) return "";
      const date = new Date(d + "T00:00:00");
      return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    };

    setText("t18", pdfDate(booking.pickup_date));
    setText("t19", fmtTime(booking.pickup_time));
    setText("t20", pdfDate(booking.return_date));
    setText("t21", fmtTime(booking.return_time));
    setText("t22", booking.customer_name || "");
    setText("t23", "");
    setText("t24", "");
    setText("t25", "");

    const totalPrice = booking.total_price ?? 0;
    const deposit = booking.deposit ?? 0;
    const pickupDate = new Date(booking.pickup_date + "T00:00:00");
    const returnDate = new Date(booking.return_date + "T00:00:00");
    const totalDays = Math.max(1, Math.ceil((returnDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24)));

    setText("t26", `$${totalPrice.toFixed(2)}`);
    setText("t27", String(totalDays));
    setText("t28", `$${(totalPrice - deposit).toFixed(2)}`);
    setCheck("c29", false);
    setCheck("c30", false);
    setCheck("c31", true);
    setText("t32", "");
    setCheck("c33", false);
    setText("t34", "");

    setText("t37", "");
    setText("t38", "");
    setText("t39", "");
    setCheck("c40", false);
    setCheck("c41", false);

    setText("t45", booking.customer_name || "");
    setText("t53", "NextGear Auto");

    // Fill date/time fields with current signing date/time
    const now = new Date();
    const signDate = now.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    const signTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

    setText("t36", signDate); // Page 1 date
    setText("t44", signDate); // Page 2 date
    setText("t46", signDate); // Page 3 renter date
    setText("t48", signTime); // Page 3 renter time
    setText("t50", signDate); // Page 3 add. driver date
    setText("t52", signTime); // Page 3 add. driver time
    setText("t54", signDate); // Page 3 rep date
    setText("t56", signTime); // Page 3 rep time
    setText("t58", signDate); // Page 3 initials date

    // Now flatten the form so fields become static text
    form.flatten();

    // Embed signature images
    const pages = pdfDoc.getPages();

    for (const [fieldId, base64Data] of Object.entries(signatures)) {
      if (!base64Data || !SIGNATURE_FIELDS[fieldId]) continue;

      const fieldPos = SIGNATURE_FIELDS[fieldId];

      try {
        // Remove data URL prefix if present
        const pngData = base64Data.replace(/^data:image\/png;base64,/, "");
        const imgBytes = Buffer.from(pngData, "base64");

        const pngImage = await pdfDoc.embedPng(imgBytes);
        const page = pages[fieldPos.page];

        if (page) {
          // Scale signature to fit the field
          const dims = pngImage.scale(1);
          const scaleX = fieldPos.width / dims.width;
          const scaleY = fieldPos.height / dims.height;
          const scale = Math.min(scaleX, scaleY);

          page.drawImage(pngImage, {
            x: fieldPos.x,
            y: fieldPos.y,
            width: dims.width * scale,
            height: dims.height * scale,
          });
        }
      } catch (imgErr) {
        console.error(`Failed to embed signature for ${fieldId}:`, imgErr);
      }
    }

    // Save the signed PDF
    const signedPdfBytes = await pdfDoc.save();

    // Upload to Supabase Storage
    const fileName = `${bookingId}/rental-agreement-signed.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("booking-documents")
      .upload(fileName, Buffer.from(signedPdfBytes), {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      // Try creating the bucket if it doesn't exist
      await supabase.storage.createBucket("booking-documents", {
        public: false,
        fileSizeLimit: 10485760, // 10MB
      });
      // Retry upload
      const { error: retryError } = await supabase.storage
        .from("booking-documents")
        .upload(fileName, Buffer.from(signedPdfBytes), {
          contentType: "application/pdf",
          upsert: true,
        });

      if (retryError) {
        console.error("Retry upload error:", retryError);
        return NextResponse.json(
          { success: false, error: "Failed to store signed agreement" },
          { status: 500 }
        );
      }
    }

    // Get a signed URL for the stored PDF
    const { data: signedUrl } = await supabase.storage
      .from("booking-documents")
      .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year expiry

    // Update booking with agreement URL and signed status
    const agreementUrl = signedUrl?.signedUrl || fileName;
    await supabase
      .from("bookings")
      .update({
        rental_agreement_url: agreementUrl,
        agreement_signed_at: now.toISOString(),
        signed_name: booking.customer_name,
      })
      .eq("id", bookingId);

    // Email the signed agreement to the customer
    if (booking.customer_email) {
      let vehicleName = "Vehicle";
      if (vehicle) vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

      sendAgreementEmail({
        bookingId: booking.id,
        customerName: booking.customer_name || "Customer",
        customerEmail: booking.customer_email,
        vehicleName,
        pickupDate: booking.pickup_date,
        returnDate: booking.return_date,
        pickupTime: booking.pickup_time || undefined,
        returnTime: booking.return_time || undefined,
        totalPrice: booking.total_price ?? 0,
        deposit: booking.deposit ?? 0,
        pdfBytes: signedPdfBytes,
      }).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      data: {
        url: agreementUrl,
        signedAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Rental agreement sign error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sign agreement" },
      { status: 500 }
    );
  }
}
