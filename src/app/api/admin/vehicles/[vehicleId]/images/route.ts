import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";
import {
  diffRemovedImageUrls,
  isValidVehicleId,
  storagePathsFromImageUrls,
  validateVehicleImagesInput,
  VEHICLE_IMAGES_BUCKET,
} from "@/lib/admin/vehicle-images";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) return auth.response;

  const { vehicleId } = await params;
  if (!isValidVehicleId(vehicleId)) {
    return NextResponse.json(
      { success: false, message: "Invalid vehicle ID" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const validated = validateVehicleImagesInput(body?.images);
    if (!validated.ok) {
      return NextResponse.json(
        { success: false, message: validated.message },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    const { data: vehicle, error: fetchError } = await supabase
      .from("vehicles")
      .select("images")
      .eq("id", vehicleId)
      .maybeSingle();

    if (fetchError || !vehicle) {
      return NextResponse.json(
        { success: false, message: "Vehicle not found" },
        { status: 404 }
      );
    }

    const previousImages = (vehicle.images as string[]) || [];
    const nextImages = validated.images;

    const { error: updateError } = await supabase
      .from("vehicles")
      .update({ images: nextImages })
      .eq("id", vehicleId);

    if (updateError) {
      logger.error("Vehicle images PATCH error:", updateError);
      return NextResponse.json(
        { success: false, message: "Failed to update images" },
        { status: 500 }
      );
    }

    const removed = diffRemovedImageUrls(previousImages, nextImages);
    const pathsToRemove = storagePathsFromImageUrls(removed);
    if (pathsToRemove.length > 0) {
      const { error: removeError } = await supabase.storage
        .from(VEHICLE_IMAGES_BUCKET)
        .remove(pathsToRemove);
      if (removeError) {
        logger.error("Failed to remove orphaned vehicle images:", removeError);
      }
    }

    return NextResponse.json({ success: true, images: nextImages });
  } catch (error) {
    logger.error("Unexpected error in PATCH vehicle images:", error);
    return NextResponse.json(
      { success: false, message: "Invalid request" },
      { status: 400 }
    );
  }
}
