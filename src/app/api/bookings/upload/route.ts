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
        { success: false, error: "Missing required fields" },
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
          error: "Invalid file type. Use JPG, PNG, WebP, or PDF.",
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

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("booking-documents")
      .upload(fileName, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { success: false, error: "Failed to upload" },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from("booking-documents")
      .getPublicUrl(uploadData.path);

    const publicUrl = urlData.publicUrl;

    // Update booking record with the URL
    const columnName =
      docType === "id_document" ? "id_document_url" : "insurance_proof_url";
    const updateData: Record<string, any> = { [columnName]: publicUrl };
    if (docType === "insurance_proof") {
      updateData.insurance_opted_out = true;
    }

    const { error: updateError } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId);

    if (updateError) {
      console.error("Database update error:", updateError);
      return NextResponse.json(
        { success: true, url: publicUrl, warning: "File uploaded but database update failed" },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error) {
    console.error("Booking upload error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
