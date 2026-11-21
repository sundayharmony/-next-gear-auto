import {
  AGREEMENT_SIGNATURE_IDS,
  buildAgreementPdf,
  type AgreementPdfVehicle,
  type AgreementRenterIdentity,
  type AgreementSignatureData,
} from "@/lib/agreement/agreement-pdf";
import { buildAgreementBookingContext } from "@/lib/agreement/agreement-booking-context";
import { getVehicleDisplayName } from "@/lib/types";
import { logger } from "@/lib/utils/logger";

export type { AgreementRenterIdentity, AgreementSignatureData };

type AgreementVehicle = AgreementPdfVehicle;

interface AgreementBooking {
  id: string;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_id?: string | null;
  pickup_date?: string | null;
  return_date?: string | null;
  pickup_time?: string | null;
  return_time?: string | null;
  total_price?: number | null;
  deposit?: number | null;
  vehicle_id?: string | null;
  agreement_signed_at?: string | null;
  signed_name?: string | null;
  rental_agreement_url?: string | null;
  admin_notes?: string | null;
  payment_method?: string | null;
  insurance_opted_out?: boolean | null;
  insurance_proof_url?: string | null;
  pickup_location_name?: string | null;
  return_location_name?: string | null;
  extras?: unknown[] | null;
  promo_code?: string | null;
  discount_amount?: number | null;
}

export async function fetchRenterIdentity(
  supabase: any,
  customerId: string | null | undefined,
): Promise<AgreementRenterIdentity | null> {
  if (!customerId) return null;
  const { data } = await supabase
    .from("customers")
    .select("dob, driver_license")
    .eq("id", customerId)
    .maybeSingle();
  if (!data) return null;

  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const license = (
    data.driver_license && typeof data.driver_license === "object" ? data.driver_license : {}
  ) as Record<string, unknown>;
  const address = (
    license.address && typeof license.address === "object" ? license.address : {}
  ) as Record<string, unknown>;
  const stateZip = [str(address.state), str(address.zip)].filter(Boolean).join(" ");
  const cityStateZip = [str(address.city), stateZip].filter(Boolean).join(", ");

  return {
    dob: str(data.dob),
    licenseNumber: str(license.number),
    licenseState: str(license.state),
    licenseExpires: str(license.expires),
    addressLine: str(address.line1),
    cityStateZip: cityStateZip || null,
  };
}

function sanitizeSignatures(signatures: Record<string, unknown>): AgreementSignatureData {
  const out: AgreementSignatureData = {};
  for (const [k, v] of Object.entries(signatures)) {
    if (!(AGREEMENT_SIGNATURE_IDS as readonly string[]).includes(k)) continue;
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

export async function buildSignedAgreementPdfBytes(
  booking: AgreementBooking,
  vehicle: AgreementVehicle | null,
  signatures: AgreementSignatureData,
  signedAtIso: string,
  renter?: AgreementRenterIdentity | null,
): Promise<Uint8Array> {
  return buildAgreementPdf({
    booking,
    vehicle,
    renter,
    context: buildAgreementBookingContext(booking),
    signatures,
    signedAtIso,
  });
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
  if (!booking.rental_agreement_url) return false;

  const signatures = await getLatestAgreementSignatures(supabase, booking.id);
  if (!signatures) {
    logger.warn(`No stored signatures found for signed booking ${booking.id}; skipping agreement refresh.`);
    return false;
  }

  const vehicle = await fetchVehicle(supabase, booking.vehicle_id);
  const renter = await fetchRenterIdentity(supabase, booking.customer_id);
  const pdfBytes = await buildSignedAgreementPdfBytes(
    booking,
    vehicle,
    signatures,
    booking.agreement_signed_at ?? new Date().toISOString(),
    renter,
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
