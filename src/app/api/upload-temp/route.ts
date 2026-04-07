import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { getAuthFromRequest } from "@/lib/auth/jwt";
import { logger } from "@/lib/utils/logger";

export async function POST(request: NextRequest) {
  try {
    // Require authentication — prevent anonymous uploads
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
    let formData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid form data" }, { status: 400 });
    }

    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: "Invalid file type" }, { status: 400 });
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

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "File too large (max 5MB)" }, { status: 400 });
    }

    const fileExt = ext || "jpg";
    const fileName = `temp/insurance_${crypto.randomUUID()}.${fileExt}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("booking-documents")
      .upload(fileName, buffer, { contentType: file.type, upsert: true });

    if (uploadError) {
      // Try creating bucket if it doesn't exist
      try {
        await supabase.storage.createBucket("booking-documents", { public: false, fileSizeLimit: 10485760 });
      } catch {
        // Bucket might already exist, continue
      }

      const { data: retryData, error: retryError } = await supabase.storage
        .from("booking-documents")
        .upload(fileName, buffer, { contentType: file.type, upsert: true });

      if (retryError) {
        return NextResponse.json({ success: false, error: retryError.message }, { status: 500 });
      }

      if (!retryData) {
        return NextResponse.json({ success: false, error: "Upload succeeded but file path unavailable" }, { status: 500 });
      }
      const { data: retryUrl } = supabase.storage.from("booking-documents").getPublicUrl(retryData.path);
      return NextResponse.json({ success: true, url: retryUrl.publicUrl });
    }

    const { data: urlData } = supabase.storage.from("booking-documents").getPublicUrl(uploadData.path);
    return NextResponse.json({ success: true, url: urlData.publicUrl });
  } catch (error) {
    logger.error("Temp upload error:", error);
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
  }
}
