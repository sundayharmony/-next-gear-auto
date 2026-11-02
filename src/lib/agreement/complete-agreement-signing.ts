import { getServiceSupabase } from "@/lib/db/supabase";
import { sendAgreementEmail } from "@/lib/email/mailer";
import { PRIMARY_AGREEMENT_SIGNATURE_ID } from "@/data/agreement-fields";
import { expandAgreementSignatures } from "@/lib/agreement/agreement-signature-expand";
import {
  AGREEMENT_VERSION,
  computeAgreementContentHash,
} from "@/lib/agreement/agreement-version";
import { logger } from "@/lib/utils/logger";
import {
  type AgreementSignatureData,
  buildSignedAgreementPdfBytes,
  uploadSignedAgreementPdf,
  vehicleNameForAgreement,
} from "@/lib/agreement/signed-agreement";

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const VALID_SIGNING_STATUSES = ["pending_approval", "pending", "confirmed", "active"] as const;

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

function validatePrimarySignaturePng(value: string, fieldId: string): string {
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

  return value;
}

export function validateAgreementSignatures(
  signatures: Record<string, unknown> | null | undefined,
): AgreementSignatureData {
  if (!signatures || typeof signatures !== "object") {
    throw new AgreementSigningError("At least one signature is required", 400);
  }

  let expanded: AgreementSignatureData;
  try {
    expanded = expandAgreementSignatures(signatures);
  } catch {
    throw new AgreementSigningError(
      `Missing required signature: ${PRIMARY_AGREEMENT_SIGNATURE_ID}`,
      400,
    );
  }

  const primary = expanded[PRIMARY_AGREEMENT_SIGNATURE_ID as keyof AgreementSignatureData];
  if (!primary) {
    throw new AgreementSigningError(
      `Missing required signature: ${PRIMARY_AGREEMENT_SIGNATURE_ID}`,
      400,
    );
  }

  validatePrimarySignaturePng(primary, PRIMARY_AGREEMENT_SIGNATURE_ID);
  return expanded;
}

export function normalizeSignedLegalName(
  signedName: string | null | undefined,
  customerName: string | null | undefined,
): string {
  const candidate = (signedName || customerName || "").trim();
  if (!candidate) {
    throw new AgreementSigningError("Legal name is required to sign the agreement", 400);
  }
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  if (customerName && normalize(candidate) !== normalize(customerName)) {
    throw new AgreementSigningError(
      "Legal name must match the name on the booking",
      400,
    );
  }
  return candidate;
}

function assertBookingSignable(booking: {
  agreement_signed_at?: string | null;
  rental_agreement_url?: string | null;
  status?: string | null;
}) {
  if (booking.rental_agreement_url) {
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
  signedName?: string | null;
  signedIp?: string | null;
  signedUserAgent?: string | null;
  ackGpsTracking?: boolean;
  ackPaymentAuthorization?: boolean;
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

  if (bookingErr) {
    logger.error("Agreement signing booking lookup error:", bookingErr);
    throw new AgreementSigningError("Unable to load booking", 500);
  }

  if (!booking) {
    throw new AgreementSigningError("Booking not found", 404);
  }

  assertBookingSignable(booking);

  if (options.channel === "customer") {
    if (!options.ackGpsTracking || !options.ackPaymentAuthorization) {
      throw new AgreementSigningError(
        "You must acknowledge GPS tracking and payment authorization before signing",
        400,
      );
    }
  }

  const signedName = normalizeSignedLegalName(
    options.signedName,
    booking.customer_name,
  );

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

  const agreementContentHash = computeAgreementContentHash();
  const bookingUpdate: Record<string, unknown> = {
    rental_agreement_url: agreementUrl,
    agreement_signed_at: signedAtIso,
    signed_name: signedName,
    agreement_version: AGREEMENT_VERSION,
    agreement_content_hash: agreementContentHash,
    signed_ip: options.signedIp || null,
    signed_user_agent: options.signedUserAgent || null,
  };

  let updateResult: { id: string } | null = null;
  let updateError = null as { code?: string; message?: string } | null;

  const attempt = await supabase
    .from("bookings")
    .update(bookingUpdate)
    .eq("id", bookingId)
    .is("rental_agreement_url", null)
    .select("id")
    .maybeSingle();

  updateResult = attempt.data;
  updateError = attempt.error;

  if (updateError?.code === "42703") {
    const fallback = await supabase
      .from("bookings")
      .update({
        rental_agreement_url: agreementUrl,
        agreement_signed_at: signedAtIso,
        signed_name: signedName,
      })
      .eq("id", bookingId)
      .is("rental_agreement_url", null)
      .select("id")
      .maybeSingle();
    updateResult = fallback.data;
    updateError = fallback.error;
  }

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
      signed_name: signedName,
      agreement_version: AGREEMENT_VERSION,
      agreement_content_hash: agreementContentHash,
      signed_ip: options.signedIp || null,
      signed_user_agent: options.signedUserAgent || null,
      ack_gps_tracking: options.ackGpsTracking ?? null,
      ack_payment_authorization: options.ackPaymentAuthorization ?? null,
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
