import { getServiceSupabase } from "@/lib/db/supabase";
import { sendAgreementEmail } from "@/lib/email/mailer";
import { AGREEMENT_SIGNATURE_FIELDS } from "@/data/agreement-fields";
import { logger } from "@/lib/utils/logger";
import {
  type AgreementSignatureData,
  buildSignedAgreementPdfBytes,
  uploadSignedAgreementPdf,
  vehicleNameForAgreement,
} from "@/lib/agreement/signed-agreement";

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const VALID_SIGNING_STATUSES = ["pending", "confirmed", "active"] as const;

export type AgreementSigningChannel = "customer" | "in_person";

export class AgreementSigningError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AgreementSigningError";
  }
}

export function validateAgreementSignatures(
  signatures: Record<string, unknown> | null | undefined,
): AgreementSignatureData {
  if (!signatures || typeof signatures !== "object") {
    throw new AgreementSigningError("At least one signature is required", 400);
  }

  const requiredIds = AGREEMENT_SIGNATURE_FIELDS.map((f) => f.id);
  const sanitized: AgreementSignatureData = {};

  for (const fieldId of requiredIds) {
    const value = signatures[fieldId];
    if (typeof value !== "string" || !value.trim()) {
      throw new AgreementSigningError(
        `Missing required signature: ${fieldId}`,
        400,
      );
    }

    const cleaned = value.replace(/^data:image\/png;base64,/, "");
    if (cleaned.length > 500 * 1024) {
      throw new AgreementSigningError(
        `Signature ${fieldId} exceeds maximum size (500KB limit)`,
        400,
      );
    }

    try {
      const imgBuffer = Buffer.from(cleaned, "base64");
      if (imgBuffer.length < 8 || !imgBuffer.subarray(0, 8).equals(PNG_MAGIC)) {
        throw new AgreementSigningError(
          `Signature ${fieldId} is not a valid PNG image`,
          400,
        );
      }
    } catch (err) {
      if (err instanceof AgreementSigningError) throw err;
      throw new AgreementSigningError(`Invalid signature data for ${fieldId}`, 400);
    }

    sanitized[fieldId as keyof AgreementSignatureData] = value;
  }

  return sanitized;
}

function assertBookingSignable(booking: {
  agreement_signed_at?: string | null;
  status?: string | null;
}) {
  if (booking.agreement_signed_at) {
    throw new AgreementSigningError("This agreement has already been signed", 409);
  }
  if (!booking.status || !VALID_SIGNING_STATUSES.includes(booking.status as (typeof VALID_SIGNING_STATUSES)[number])) {
    throw new AgreementSigningError(
      "This booking is not in a valid state for signing",
      400,
    );
  }
}

export interface CompleteAgreementSigningOptions {
  performedBy: string;
  channel: AgreementSigningChannel;
  skipEmail?: boolean;
}

export interface CompleteAgreementSigningResult {
  url: string;
  signedAt: string;
}

export async function completeAgreementSigning(
  bookingId: string,
  signaturesInput: Record<string, unknown>,
  options: CompleteAgreementSigningOptions,
): Promise<CompleteAgreementSigningResult> {
  const supabase = getServiceSupabase();
  const signatures = validateAgreementSignatures(signaturesInput);

  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingErr || !booking) {
    throw new AgreementSigningError("Booking not found", 404);
  }

  assertBookingSignable(booking);

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
      .maybeSingle();
    vehicle = v;
  }

  const signedAtIso = new Date().toISOString();
  const signedPdfBytes = await buildSignedAgreementPdfBytes(
    booking,
    vehicle,
    signatures,
    signedAtIso,
  );
  const agreementUrl = await uploadSignedAgreementPdf(supabase, bookingId, signedPdfBytes);

  const { data: updateResult, error: updateError } = await supabase
    .from("bookings")
    .update({
      rental_agreement_url: agreementUrl,
      agreement_signed_at: signedAtIso,
      signed_name: booking.customer_name,
    })
    .eq("id", bookingId)
    .is("agreement_signed_at", null)
    .select("id")
    .maybeSingle();

  if (updateError || !updateResult) {
    throw new AgreementSigningError(
      "This agreement was already signed by another request",
      409,
    );
  }

  await supabase.from("booking_activity").insert({
    booking_id: bookingId,
    action: "agreement_signed",
    details: {
      channel: options.channel,
      signatures,
      signed_at: signedAtIso,
    },
    performed_by: options.performedBy,
  });

  if (!options.skipEmail && booking.customer_email) {
    const vehicleName = await vehicleNameForAgreement(supabase, booking.vehicle_id);
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
    }).catch(logger.error);
  }

  return { url: agreementUrl, signedAt: signedAtIso };
}
