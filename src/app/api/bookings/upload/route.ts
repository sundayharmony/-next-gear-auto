import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { getAuthFromRequest } from "@/lib/auth/jwt";
import { logger } from "@/lib/utils/logger";

export async function POST(request: NextRequest) {
  try {
    // Require authentication — only the booking owner or an admin can upload documents
    let auth;
    try {
      auth = await getAuthFromRequest(request);
    } catch {
      auth = null;
    }
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const supabase = getServiceSupabase();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const bookingId = formData.get("bookingId") as string | null;
    const docType = formData.get("type") as string | null; // "id_document" or "insurance_proof"

    if (!file || !bookingId || !docType) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: file=${!!file}, bookingId=${bookingId}, type=${docType}` },
        { status: 400 }
      );
    }

    // Validate docType
    if (!["id_document", "insurance_proof"].includes(docType)) {
      return NextResponse.json(
        { success: false, error: "Invalid document type" },
        { status: 400 }
      );
    }

    // Verify the caller owns this booking (or is admin)
    if (auth.role !== "admin") {
      const { data: bookingOwner } = await supabase
        .from("bookings")
        .select("customer_email")
        .eq("id", bookingId)
        .single();

      if (!bookingOwner || bookingOwner.customer_email?.toLowerCase() !== auth.email?.toLowerCase()) {
        return NextResponse.json(
          { success: false, error: "You can only upload documents for your own bookings" },
          { status: 403 }
        );
      }
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file type "${file.type}". Use JPG, PNG, WebP, or PDF.`,
        },
        { status: 400 }
      );
    }

    // Validate file extension matches MIME type
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const extMimeMap: Record<string, string[]> = {
      jpg: ["image/jpeg"], jpeg: ["image/jpeg"], png: ["image/png"],
      webp: ["image/webp"], pdf: ["application/pdf"],
    };
    if (!extMimeMap[ext] || !extMimeMap[ext].includes(file.type)) {
      return NextResponse.json({ success: false, error: "File extension does not match content type" }, { status: 400 });
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum 5MB." },
        { status: 400 }
      );
    }

    const fileExt = ext || "jpg";
    const fileName = `${bookingId}/${docType}_${crypto.randomUUID()}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use upsert: true to allow re-uploads
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("booking-documents")
      .upload(fileName, buffer, { contentType: file.type, upsert: true });

    if (uploadError) {
      logger.error("Storage upload error:", JSON.stringify(uploadError));
      // If bucket doesn't exist, try creating it
      if (uploadError.message?.includes("not found") || uploadError.message?.includes("Bucket")) {
        await supabase.storage.createBucket("booking-documents", {
          public: false,
          fileSizeLimit: 10485760,
        });
        // Retry upload
        const { data: retryData, error: retryError } = await supabase.storage
          .from("booking-documents")
          .upload(fileName, buffer, { contentType: file.type, upsert: true });
        if (retryError) {
          logger.error("Retry upload error:", JSON.stringify(retryError));
          return NextResponse.json(
            { success: false, error: `Upload failed after retry: ${retryError.message}` },
            { status: 500 }
          );
        }
        if (retryData) {
          const { data: retryUrl } = supabase.storage
            .from("booking-documents")
            .getPublicUrl(retryData.path);
          return updateBookingAndRespond(supabase, bookingId, docType, retryUrl.publicUrl);
        }
      }
      return NextResponse.json(
        { success: false, error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from("booking-documents")
      .getPublicUrl(uploadData.path);

    return updateBookingAndRespond(supabase, bookingId, docType, urlData.publicUrl);
  } catch (error) {
    logger.error("Booking upload error:", error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : "Unknown"}` },
      { status: 500 }
    );
  }
}

async function updateBookingAndRespond(supabase: ReturnType<typeof import("@/lib/db/supabase").getServiceSupabase>, bookingId: string, docType: string, publicUrl: string) {
  const columnName =
    docType === "id_document" ? "id_document_url" : "insurance_proof_url";
  const updateData: Record<string, unknown> = { [columnName]: publicUrl };
  if (docType === "insurance_proof") {
    updateData.insurance_opted_out = true;
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update(updateData)
    .eq("id", bookingId);

  if (updateError) {
    logger.error("Database update error:", JSON.stringify(updateError));
    return NextResponse.json(
      { success: false, url: publicUrl, message: `File uploaded but failed to link to booking: ${updateError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, url: publicUrl });
}
