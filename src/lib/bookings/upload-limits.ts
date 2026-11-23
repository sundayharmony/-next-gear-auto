/** Booking document upload — shared limits for `/api/bookings/upload`. */

export const BOOKING_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

export const BOOKING_UPLOAD_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const BOOKING_UPLOAD_DOC_TYPES = ["id_document", "id_document_back", "insurance_proof"] as const;
export type BookingUploadDocType = (typeof BOOKING_UPLOAD_DOC_TYPES)[number];

/** Database column (on bookings and customers) that stores each document type's URL. */
export function documentUrlColumn(docType: string): string {
  if (docType === "id_document") return "id_document_url";
  if (docType === "id_document_back") return "id_document_back_url";
  return "insurance_proof_url";
}
