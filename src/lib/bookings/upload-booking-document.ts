import {
  BOOKING_UPLOAD_ALLOWED_MIME_TYPES,
  BOOKING_UPLOAD_MAX_BYTES,
} from "@/lib/bookings/upload-limits";
import { compressImage } from "@/lib/utils/compress-image";
import { csrfFetch } from "@/lib/utils/csrf-fetch";

/** Stay under Vercel's ~4.5MB request body limit after multipart overhead. */
export const BOOKING_UPLOAD_CLIENT_MAX_BYTES = 4 * 1024 * 1024;

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

function fileExtension(file: File): string {
  return file.name.split(".").pop()?.toLowerCase() || "";
}

export function inferBookingDocMime(file: File): string | null {
  if (
    file.type &&
    (BOOKING_UPLOAD_ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)
  ) {
    return file.type;
  }
  return EXT_MIME[fileExtension(file)] || null;
}

/** Client-side validation before upload. Returns an error message or null if OK. */
export function validateBookingDocFile(file: File): string | null {
  if (!file?.name) return "No file selected.";
  if (file.size <= 0) return "File appears to be empty.";

  const ext = fileExtension(file);
  if (ext === "heic" || ext === "heif" || file.type === "image/heic" || file.type === "image/heif") {
    return "iPhone HEIC photos are not supported here. Use Settings → Camera → Formats → Most Compatible, or upload a JPG/PNG screenshot of your license.";
  }

  const mime = inferBookingDocMime(file);
  if (!mime) {
    return "Please upload a JPG, PNG, WebP, or PDF file.";
  }

  // Allow larger camera originals; compression runs before upload.
  if (file.size > 25 * 1024 * 1024) {
    return "File is too large. Please use a photo under 25MB or take a new picture.";
  }

  return null;
}

async function prepareBookingDocFile(file: File): Promise<File> {
  const mime = inferBookingDocMime(file);
  if (!mime) return file;

  if (mime === "application/pdf") {
    if (file.size > BOOKING_UPLOAD_MAX_BYTES) {
      throw new Error("PDF must be under 5MB.");
    }
    return file;
  }

  const normalized =
    file.type === mime
      ? file
      : new File([file], file.name.replace(/\.[^.]+$/, "") + (mime === "image/png" ? ".png" : ".jpg"), {
          type: mime,
        });

  return compressImage(normalized, BOOKING_UPLOAD_CLIENT_MAX_BYTES / (1024 * 1024), 2048, 0.82);
}

function mapUploadHttpError(status: number, apiError?: string): string {
  if (status === 401) return "Your session expired. Refresh the page and try again.";
  if (status === 403) return "Upload was blocked. Refresh the page and try again.";
  if (status === 413) return "File is too large after processing. Try a smaller photo or PDF.";
  if (status === 429) return "Too many upload attempts. Please wait a few minutes and try again.";
  if (apiError) return apiError;
  if (status >= 500) return "Upload service is temporarily unavailable. Please try again.";
  return "Upload failed. Please try again.";
}

/** Upload a booking ID or insurance document during the public checkout wizard. */
export async function uploadBookingDocumentTemp(
  file: File
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const validationError = validateBookingDocFile(file);
  if (validationError) return { ok: false, error: validationError };

  let prepared: File;
  try {
    prepared = await prepareBookingDocFile(file);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not prepare file for upload.",
    };
  }

  if (prepared.size > BOOKING_UPLOAD_MAX_BYTES) {
    return {
      ok: false,
      error: "File is still too large after compression. Try a smaller photo or PDF under 5MB.",
    };
  }

  const formData = new FormData();
  formData.append("file", prepared);

  let res: Response;
  try {
    res = await csrfFetch("/api/upload-temp", { method: "POST", body: formData });
  } catch {
    return { ok: false, error: "Connection lost during upload. Check your network and try again." };
  }

  let data: { success?: boolean; error?: string; url?: string } | null = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON (e.g. platform body limit) — use status-based message
  }

  if (!res.ok || !data?.success || !data.url) {
    return { ok: false, error: mapUploadHttpError(res.status, data?.error) };
  }

  return { ok: true, url: data.url };
}
