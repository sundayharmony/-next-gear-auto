/** Booking document upload — shared limits for `/api/bookings/upload` and native clients. */

export const BOOKING_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

export const BOOKING_UPLOAD_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const BOOKING_UPLOAD_DOC_TYPES = ["id_document", "insurance_proof"] as const;
export type BookingUploadDocType = (typeof BOOKING_UPLOAD_DOC_TYPES)[number];
