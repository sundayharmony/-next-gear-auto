import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: "Invalid file type" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "File too large (max 5MB)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `temp/insurance_${crypto.randomUUID()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("booking-documents")
      .upload(fileName, buffer, { contentType: file.type, upsert: true });

    if (uploadError) {
      // Try creating bucket if it doesn't exist
      try {
        await supabase.storage.createBucket("booking-documents", { public: true, fileSizeLimit: 10485760 });
      } catch {
        // Bucket might already exist, continue
      }

      const { data: retryData, error: retryError } = await supabase.storage
        .from("booking-documents")
        .upload(fileName, buffer, { contentType: file.type, upsert: true });

      if (retryError) {
        return NextResponse.json({ success: false, error: retryError.message }, { status: 500 });
      }

      const { data: retryUrl } = supabase.storage.from("booking-documents").getPublicUrl(retryData!.path);
      return NextResponse.json({ success: true, url: retryUrl.publicUrl });
    }

    const { data: urlData } = supabase.storage.from("booking-documents").getPublicUrl(uploadData.path);
    return NextResponse.json({ success: true, url: urlData.publicUrl });
  } catch (error) {
    logger.error("Temp upload error:", error);
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
  }
}
