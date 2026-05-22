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

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Use JPG, PNG, WebP, or SVG." },
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
      "image/svg+xml": "svg",
    };
    const ext = SAFE_EXTENSIONS[file.type] || "jpg";
    const folder = vehicleId || "temp";
    const fileName = `${folder}/${crypto.randomUUID()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const magicBytes = new Uint8Array(arrayBuffer.slice(0, 12));
    const isJpeg = magicBytes[0] === 0xff && magicBytes[1] === 0xd8 && magicBytes[2] === 0xff;
    const isPng =
      magicBytes[0] === 0x89 &&
      magicBytes[1] === 0x50 &&
      magicBytes[2] === 0x4e &&
      magicBytes[3] === 0x47;
    const isWebp =
      magicBytes[0] === 0x52 &&
      magicBytes[1] === 0x49 &&
      magicBytes[2] === 0x46 &&
      magicBytes[3] === 0x46 &&
      magicBytes[8] === 0x57 &&
      magicBytes[9] === 0x45 &&
      magicBytes[10] === 0x42 &&
      magicBytes[11] === 0x50;
    const isSvg = file.type === "image/svg+xml";

    const magicValid =
      (file.type === "image/jpeg" && isJpeg) ||
      (file.type === "image/png" && isPng) ||
      (file.type === "image/webp" && isWebp) ||
      isSvg;

    if (!magicValid) {
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
