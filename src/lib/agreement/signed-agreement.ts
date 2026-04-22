import { PDFDocument } from "pdf-lib";
import fs from "fs/promises";
import path from "path";
import { fmtTime } from "@/lib/email/templates";
import { getVehicleDisplayName } from "@/lib/types";
import { logger } from "@/lib/utils/logger";

export interface AgreementSignatureData {
  t35?: string;
  t42?: string;
  t43?: string;
  t47?: string;
  t51?: string;
  t55?: string;
  t57?: string;
}

interface AgreementVehicle {
  make?: string;
  model?: string;
  year?: number;
  license_plate?: string;
  vin?: string;
  color?: string;
  mileage?: number;
}

interface AgreementBooking {
  id: string;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  pickup_date?: string | null;
  return_date?: string | null;
  pickup_time?: string | null;
  return_time?: string | null;
  total_price?: number | null;
  deposit?: number | null;
  vehicle_id?: string | null;
  agreement_signed_at?: string | null;
  signed_name?: string | null;
}

const SIGNATURE_FIELDS: Record<
  string,
  { page: number; x: number; y: number; width: number; height: number }
> = {
  t35: { page: 0, x: 418, y: 34, width: 50, height: 14 },
  t42: { page: 1, x: 105.5, y: 243, width: 70, height: 16 },
  t43: { page: 1, x: 418, y: 34, width: 50, height: 14 },
  t47: { page: 2, x: 128.5, y: 369, width: 230, height: 16 },
  t51: { page: 2, x: 167.5, y: 317, width: 230, height: 16 },
  t55: { page: 2, x: 162, y: 265, width: 230, height: 16 },
  t57: { page: 2, x: 418, y: 34, width: 50, height: 14 },
};

function pdfDate(value: string | null | undefined): string {
  if (!value) return "";
  const parts = value.split("-");
  if (parts.length !== 3) return "";
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d || Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return "";
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

function sanitizeSignatures(signatures: Record<string, unknown>): AgreementSignatureData {
  const out: AgreementSignatureData = {};
  for (const [k, v] of Object.entries(signatures)) {
    if (!(k in SIGNATURE_FIELDS)) continue;
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    if (!trimmed) continue;
    (out as Record<string, string>)[k] = trimmed;
  }
  return out;
}

async function fetchVehicle(supabase: any, vehicleId: string | null | undefined): Promise<AgreementVehicle | null> {
  if (!vehicleId) return null;
  const { data } = await supabase.from("vehicles").select("*").eq("id", vehicleId).maybeSingle();
  return data || null;
}

function fillAgreementForm(form: any, booking: AgreementBooking, vehicle: AgreementVehicle | null, signedAtIso: string) {
  const setText = (fieldName: string, value: string | number | null | undefined) => {
    try {
      form.getTextField(fieldName).setText(String(value ?? ""));
    } catch {
      // Field missing in template
    }
  };
  const setCheck = (fieldName: string, checked: boolean) => {
    try {
      const field = form.getCheckBox(fieldName);
      if (checked) field.check();
      else field.uncheck();
    } catch {
      // Checkbox missing in template
    }
  };

  if (vehicle) {
    setText("t1", `${vehicle.make || ""} ${vehicle.model || ""}`.trim());
    setText("t2", vehicle.year ?? "");
    setText("t3", vehicle.license_plate ?? "");
    setText("t4", vehicle.vin ?? "");
    setText("t5", vehicle.color ?? "");
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
  setText("t18", pdfDate(booking.pickup_date));
  setText("t19", fmtTime(booking.pickup_time || null));
  setText("t20", pdfDate(booking.return_date));
  setText("t21", fmtTime(booking.return_time || null));
  setText("t22", booking.customer_name || "");
  setText("t23", "");
  setText("t24", "");
  setText("t25", "");

  const totalPrice = booking.total_price ?? 0;
  const deposit = booking.deposit ?? 0;
  const pickupDate = booking.pickup_date ? new Date(`${booking.pickup_date}T00:00:00`) : new Date();
  const returnDate = booking.return_date ? new Date(`${booking.return_date}T00:00:00`) : new Date();
  const totalDays = Math.max(1, Math.ceil((returnDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24) || 1));
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

  const signDate = new Date(signedAtIso).toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
  const signTime = new Date(signedAtIso).toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  setText("t36", signDate);
  setText("t44", signDate);
  setText("t46", signDate);
  setText("t48", signTime);
  setText("t50", signDate);
  setText("t52", signTime);
  setText("t54", signDate);
  setText("t56", signTime);
  setText("t58", signDate);
}

export async function buildSignedAgreementPdfBytes(
  booking: AgreementBooking,
  vehicle: AgreementVehicle | null,
  signatures: AgreementSignatureData,
  signedAtIso: string,
): Promise<Uint8Array> {
  const templatePath = path.join(process.cwd(), "public", "templates", "rental-agreement.pdf");
  const templateBytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  fillAgreementForm(form, booking, vehicle, signedAtIso);
  form.flatten();

  const pages = pdfDoc.getPages();
  for (const [fieldId, base64Data] of Object.entries(signatures)) {
    if (!base64Data || !SIGNATURE_FIELDS[fieldId]) continue;
    const pos = SIGNATURE_FIELDS[fieldId];
    try {
      const pngData = base64Data.replace(/^data:image\/png;base64,/, "");
      const imgBytes = Buffer.from(pngData, "base64");
      const png = await pdfDoc.embedPng(imgBytes);
      const page = pages[pos.page];
      if (!page) continue;
      const dims = png.scale(1);
      const scale = Math.min(pos.width / dims.width, pos.height / dims.height);
      page.drawImage(png, {
        x: pos.x,
        y: pos.y,
        width: dims.width * scale,
        height: dims.height * scale,
      });
    } catch (err) {
      logger.error(`Failed to embed signature ${fieldId}:`, err);
    }
  }

  return pdfDoc.save();
}

export async function uploadSignedAgreementPdf(
  supabase: any,
  bookingId: string,
  pdfBytes: Uint8Array,
): Promise<string> {
  const fileName = `${bookingId}/rental-agreement-signed.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("booking-documents")
    .upload(fileName, Buffer.from(pdfBytes), {
      contentType: "application/pdf",
      upsert: true,
    });
  if (uploadError) {
    await supabase.storage.createBucket("booking-documents", {
      public: false,
      fileSizeLimit: 10485760,
    });
    const { error: retryError } = await supabase.storage
      .from("booking-documents")
      .upload(fileName, Buffer.from(pdfBytes), {
        contentType: "application/pdf",
        upsert: true,
      });
    if (retryError) throw retryError;
  }

  const { data: signedUrl } = await supabase.storage
    .from("booking-documents")
    .createSignedUrl(fileName, 60 * 60 * 24 * 365);
  return signedUrl?.signedUrl || fileName;
}

export async function getLatestAgreementSignatures(
  supabase: any,
  bookingId: string,
): Promise<AgreementSignatureData | null> {
  const { data: rows } = await supabase
    .from("booking_activity")
    .select("details, created_at")
    .eq("booking_id", bookingId)
    .eq("action", "agreement_signed")
    .order("created_at", { ascending: false })
    .limit(1);

  const details = rows?.[0]?.details;
  const sigsRaw = details?.signatures;
  if (!sigsRaw || typeof sigsRaw !== "object") return null;
  const sigs = sanitizeSignatures(sigsRaw as Record<string, unknown>);
  return Object.keys(sigs).length ? sigs : null;
}

export async function regenerateSignedAgreementForBooking(
  supabase: any,
  booking: AgreementBooking,
): Promise<boolean> {
  if (!booking.agreement_signed_at) return false;

  const signatures = await getLatestAgreementSignatures(supabase, booking.id);
  if (!signatures) {
    logger.warn(`No stored signatures found for signed booking ${booking.id}; skipping agreement refresh.`);
    return false;
  }

  const vehicle = await fetchVehicle(supabase, booking.vehicle_id);
  const pdfBytes = await buildSignedAgreementPdfBytes(
    booking,
    vehicle,
    signatures,
    booking.agreement_signed_at,
  );
  const agreementUrl = await uploadSignedAgreementPdf(supabase, booking.id, pdfBytes);

  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      rental_agreement_url: agreementUrl,
      signed_name: booking.signed_name || booking.customer_name || null,
    })
    .eq("id", booking.id);
  if (updateError) {
    logger.error("Failed to persist regenerated agreement URL:", updateError);
    return false;
  }

  await supabase.from("booking_activity").insert({
    booking_id: booking.id,
    action: "agreement_regenerated",
    details: {
      reason: "booking_dates_or_times_updated",
      pickup_date: booking.pickup_date,
      return_date: booking.return_date,
      pickup_time: booking.pickup_time,
      return_time: booking.return_time,
    },
  });

  return true;
}

export async function vehicleNameForAgreement(
  supabase: any,
  vehicleId: string | null | undefined,
): Promise<string> {
  const vehicle = await fetchVehicle(supabase, vehicleId);
  return vehicle ? getVehicleDisplayName(vehicle) : "Vehicle";
}
