import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const maintenanceId = formData.get("maintenanceId") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type (JPG, PNG, PDF, WebP)
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Use JPG, PNG, PDF, or WebP." },
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

    const supabase = getServiceSupabase();

    // Generate unique filename
    const ext = file.name.split(".").pop() || "pdf";
    const folder = maintenanceId || "temp";
    const fileName = `${folder}/${crypto.randomUUID()}.${ext}`;

    // Convert File to ArrayBuffer then to Buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("maintenance-photos")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error("Supabase storage upload error:", uploadError);
      return NextResponse.json(
        { success: false, error: "Failed to upload photo: " + uploadError.message },
        { status: 500 }
      );
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from("maintenance-photos")
      .getPublicUrl(uploadData.path);

    const publicUrl = urlData.publicUrl;

    // If maintenanceId provided, update maintenance record's photo_urls array
    if (maintenanceId) {
      const { data: record, error: fetchError } = await supabase
        .from("maintenance_records")
        .select("photo_urls")
        .eq("id", maintenanceId)
        .single();

      if (fetchError) {
        logger.error("Error fetching maintenance record:", fetchError);
        return NextResponse.json({
          success: true,
          url: publicUrl,
          warning: "Photo uploaded but could not update record",
        });
      }

      const currentUrls = record?.photo_urls || [];
      const updatedUrls = [...(currentUrls || []), publicUrl];

      const { error: updateError } = await supabase
        .from("maintenance_records")
        .update({ photo_urls: updatedUrls })
        .eq("id", maintenanceId);

      if (updateError) {
        logger.error("Error updating maintenance photo_urls:", updateError);
        return NextResponse.json({
          success: true,
          url: publicUrl,
          warning: "Photo uploaded but could not update record",
        });
      }

      return NextResponse.json({
        success: true,
        url: publicUrl,
        photoUrls: updatedUrls,
      });
    }

    // No maintenanceId — just return the uploaded URL
    return NextResponse.json({
      success: true,
      url: publicUrl,
    });
  } catch (error) {
    logger.error("Unexpected error in POST /api/admin/maintenance/upload:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
