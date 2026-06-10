import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";
import {
  isAllowedVehicleImageUrl,
  isValidVehicleId,
  parseVehicleImageStoragePath,
  VEHICLE_IMAGES_BUCKET,
} from "@/lib/admin/vehicle-images";

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) return auth.response;
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const vehicleIdRaw = formData.get("vehicleId") as string | null;
    const vehicleId =
      vehicleIdRaw && isValidVehicleId(vehicleIdRaw) ? vehicleIdRaw.trim() : null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Use JPG, PNG, or WebP." },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum 5MB." },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    const SAFE_EXTENSIONS: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const ext = SAFE_EXTENSIONS[file.type] || "jpg";
    const folder = vehicleId || "temp";
    const fileName = `${folder}/${crypto.randomUUID()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { validateImageOrPdfMagicBytes } = await import("@/lib/security/magic-bytes");
    if (!validateImageOrPdfMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { success: false, error: "File content does not match declared type" },
        { status: 400 }
      );
    }

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(VEHICLE_IMAGES_BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error("Supabase storage upload error:", uploadError);
      return NextResponse.json(
        { success: false, error: "Failed to upload image" },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from(VEHICLE_IMAGES_BUCKET)
      .getPublicUrl(uploadData.path);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
    });
  } catch (error) {
    logger.error("Unexpected error in POST /api/admin/vehicles/upload:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) return auth.response;
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string" || !isAllowedVehicleImageUrl(url)) {
      return NextResponse.json(
        { success: false, error: "Invalid or unsupported image URL" },
        { status: 400 }
      );
    }

    const filePath = parseVehicleImageStoragePath(url);
    if (!filePath) {
      return NextResponse.json({ success: true });
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase.storage
      .from(VEHICLE_IMAGES_BUCKET)
      .remove([filePath]);
    if (error) {
      logger.error("Failed to remove image from storage:", error);
      return NextResponse.json(
        { success: false, error: "Failed to remove image" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Unexpected error in DELETE /api/admin/vehicles/upload:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
