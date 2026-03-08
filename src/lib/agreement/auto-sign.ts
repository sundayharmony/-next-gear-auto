import { PDFDocument } from "pdf-lib";
import { getServiceSupabase } from "@/lib/db/supabase";
import path from "path";
import fs from "fs/promises";

/**
 * Auto-sign a rental agreement with text-based initials/signature.
 * Used when admin creates a booking — the agreement is automatically
 * signed with the client's initials and name.
 *
 * Returns { url, pdfBytes } or null on failure.
 */
export async function autoSignAgreement(bookingId: string) {
  const supabase = getServiceSupabase();

  // Fetch booking
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (bookingErr || !booking) {
    console.error("Auto-sign: booking not found", bookingId);
    return null;
  }

  // Fetch vehicle
  let vehicle: any = null;
  if (booking.vehicle_id) {
    const { data: v } = await supabase
      .from("vehicles")
      .select("*")
      .eq("id", booking.vehicle_id)
      .single();
    vehicle = v;
  }

  // Load blank PDF template
  const templatePath = path.join(process.cwd(), "public", "templates", "rental-agreement.pdf");
  let templateBytes: Buffer;
  try {
    templateBytes = await fs.readFile(templatePath);
  } catch (err) {
    console.error("Auto-sign: PDF template not found:", templatePath, err);
    return null;
  }
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

  // Helper date/time formatters
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

  // === Fill all fields (same as generate route) ===
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

  setText("t18", formatDate(booking.pickup_date));
  setText("t19", formatTime(booking.pickup_time));
  setText("t20", formatDate(booking.return_date));
  setText("t21", formatTime(booking.return_time));
  setText("t22", booking.customer_name || "");
  setText("t23", "");
  setText("t24", "");
  setText("t25", "");

  const totalPrice = booking.total_price || 0;
  const deposit = booking.deposit || 0;
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

  // Generate initials from customer name (e.g., "John Doe" → "JD")
  const customerName = booking.customer_name || "Customer";
  const initials = customerName
    .split(/\s+/)
    .filter(Boolean)
    .map((w: string) => w[0].toUpperCase())
    .join("");

  // Fill initials into signature fields as text
  setText("t35", initials); // Page 1 initials
  setText("t42", initials); // GPS initials (Page 2)
  setText("t43", initials); // Page 2 initials
  setText("t57", initials); // Page 3 initials

  // Fill full signature field with customer name
  setText("t47", customerName); // Renter signature (Page 3)
  setText("t51", ""); // Additional driver — leave blank
  setText("t55", "NextGear Auto"); // NGA Rep signature

  setText("t45", customerName); // Renter Name (Print)
  setText("t53", "NextGear Auto");

  // Fill date/time fields with current signing date/time
  const now = new Date();
  const signDate = now.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  const signTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

  setText("t36", signDate);
  setText("t44", signDate);
  setText("t46", signDate);
  setText("t48", signTime);
  setText("t50", "");
  setText("t52", "");
  setText("t54", signDate);
  setText("t56", signTime);
  setText("t58", signDate);

  // Also put "Auto-signed by admin" marker in unused fields
  setText("t37", "");
  setText("t38", "");
  setText("t39", "");
  setCheck("c40", false);
  setCheck("c41", false);

  // Flatten the form
  form.flatten();

  // Save PDF
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
    console.error("Auto-sign upload error:", uploadError);
    // Try creating the bucket
    await supabase.storage.createBucket("booking-documents", {
      public: false,
      fileSizeLimit: 10485760,
    });
    const { error: retryError } = await supabase.storage
      .from("booking-documents")
      .upload(fileName, Buffer.from(signedPdfBytes), {
        contentType: "application/pdf",
        upsert: true,
      });
    if (retryError) {
      console.error("Auto-sign retry upload error:", retryError);
      return null;
    }
  }

  // Get signed URL
  const { data: signedUrl } = await supabase.storage
    .from("booking-documents")
    .createSignedUrl(fileName, 60 * 60 * 24 * 365);

  const agreementUrl = signedUrl?.signedUrl || fileName;

  // Update booking
  await supabase
    .from("bookings")
    .update({
      rental_agreement_url: agreementUrl,
      agreement_signed_at: now.toISOString(),
      signed_name: customerName,
    })
    .eq("id", bookingId);

  return {
    url: agreementUrl,
    pdfBytes: signedPdfBytes,
    signedAt: now.toISOString(),
  };
}
