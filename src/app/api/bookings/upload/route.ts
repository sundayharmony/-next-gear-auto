import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";

export async function POST(request: NextRequest) {
  try {
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

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum 5MB." },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${bookingId}/${docType}_${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use upsert: true to allow re-uploads
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("booking-documents")
      .upload(fileName, buffer, { contentType: file.type, upsert: true });

    if (uploadError) {
      console.error("Storage upload error:", JSON.stringify(uploadError));
      // If bucket doesn't exist, try creating it
      if (uploadError.message?.includes("not found") || uploadError.message?.includes("Bucket")) {
        await supabase.storage.createBucket("booking-documents", {
          public: true,
          fileSizeLimit: 10485760,
        });
        // Retry upload
        const { data: retryData, error: retryError } = await supabase.storage
          .from("booking-documents")
          .upload(fileName, buffer, { contentType: file.type, upsert: true });
        if (retryError) {
          console.error("Retry upload error:", JSON.stringify(retryError));
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
    console.error("Booking upload error:", error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : "Unknown"}` },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateBookingAndRespond(supabase: any, bookingId: string, docType: string, publicUrl: string) {
  const columnName =
    docType === "id_document" ? "id_document_url" : "insurance_proof_url";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = { [columnName]: publicUrl };
  if (docType === "insurance_proof") {
    updateData.insurance_opted_out = true;
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update(updateData)
    .eq("id", bookingId);

  if (updateError) {
    console.error("Database update error:", JSON.stringify(updateError));
    return NextResponse.json(
      { success: true, url: publicUrl, warning: `File uploaded but DB update failed: ${updateError.message}` },
      { status: 200 }
    );
  }

  return NextResponse.json({ success: true, url: publicUrl });
}
