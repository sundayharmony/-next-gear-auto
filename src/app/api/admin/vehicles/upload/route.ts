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

    // Generate unique filename
    const ext = file.name.split(".").pop() || "jpg";
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
        .single();

      if (fetchError) {
        logger.error("Error fetching vehicle:", fetchError);
        return NextResponse.json({
          success: true,
          url: publicUrl,
          warning: "Image uploaded but could not update vehicle record",
        });
      }

      const currentImages = vehicle?.images || [];
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
