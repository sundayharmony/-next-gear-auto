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
    const vehicleId = formData.get("vehicleId") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Use JPG, PNG, WebP, or SVG." },
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

    // Generate unique filename with safe extension
    const SAFE_EXTENSIONS: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/svg+xml": "svg",
    };
    const ext = SAFE_EXTENSIONS[file.type] || "jpg";
    const folder = vehicleId || "temp";
    const fileName = `${folder}/${crypto.randomUUID()}.${ext}`;

    // Convert File to ArrayBuffer then to Buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("vehicle-images")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error("Supabase storage upload error:", uploadError);
      return NextResponse.json(
        { success: false, error: "Failed to upload image: " + uploadError.message },
        { status: 500 }
      );
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from("vehicle-images")
      .getPublicUrl(uploadData.path);

    const publicUrl = urlData.publicUrl;

    // If vehicleId provided, update vehicle images array in DB
    if (vehicleId) {
      const { data: vehicle, error: fetchError } = await supabase
        .from("vehicles")
        .select("images")
        .eq("id", vehicleId)
        .maybeSingle();

      if (fetchError) {
        logger.error("Error fetching vehicle:", fetchError);
        return NextResponse.json({
          success: true,
          url: publicUrl,
          warning: "Image uploaded but could not update vehicle record",
        });
      }

      const currentImages = (vehicle?.images as string[]) || [];
      const updatedImages = [...currentImages, publicUrl];

      const { error: updateError } = await supabase
        .from("vehicles")
        .update({ images: updatedImages })
        .eq("id", vehicleId);

      if (updateError) {
        logger.error("Error updating vehicle images:", updateError);
        return NextResponse.json({
          success: true,
          url: publicUrl,
          warning: "Image uploaded but could not update vehicle record",
        });
      }

      return NextResponse.json({
        success: true,
        url: publicUrl,
        images: updatedImages,
      });
    }

    // No vehicleId — just return the uploaded URL (for new vehicles)
    return NextResponse.json({
      success: true,
      url: publicUrl,
    });
  } catch (error) {
    logger.error("Unexpected error in POST /api/admin/vehicles/upload:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a single image from Supabase storage
export async function DELETE(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) return auth.response;
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ success: false, error: "Image URL required" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const bucket = "vehicle-images";
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) {
      return NextResponse.json({ success: false, error: "Invalid storage URL" }, { status: 400 });
    }

    const filePath = url.substring(idx + marker.length);
    const { error } = await supabase.storage.from(bucket).remove([filePath]);
    if (error) {
      logger.error("Failed to remove image from storage:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Unexpected error in DELETE /api/admin/vehicles/upload:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
