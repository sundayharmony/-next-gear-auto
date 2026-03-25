import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const customerId = formData.get("customerId") as string | null;

    if (!file || !customerId) {
      return NextResponse.json(
        { success: false, error: "Missing file or customerId" },
        { status: 400 }
      );
    }

    // Validate file type (only images for profile pictures)
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Use JPG, PNG, or WebP." },
        { status: 400 }
      );
    }

    // 2MB max for profile pictures
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum 2MB." },
        { status: 400 }
      );
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const fileName = `profiles/${customerId}_${crypto.randomUUID()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Try uploading to profile-pictures bucket
    let bucketName = "profile-pictures";
    let uploadResult = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, { contentType: file.type, upsert: true });

    // If bucket doesn't exist, create it and retry
    if (uploadResult.error?.message?.includes("not found") || uploadResult.error?.message?.includes("Bucket")) {
      await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 2097152, // 2MB
      });
      uploadResult = await supabase.storage
        .from(bucketName)
        .upload(fileName, buffer, { contentType: file.type, upsert: true });
    }

    // If profile-pictures bucket still fails, fall back to booking-documents bucket
    if (uploadResult.error) {
      bucketName = "booking-documents";
      const fallbackFileName = `profiles/${customerId}_${Date.now()}.${ext}`;
      uploadResult = await supabase.storage
        .from(bucketName)
        .upload(fallbackFileName, buffer, { contentType: file.type, upsert: true });

      if (uploadResult.error) {
        return NextResponse.json(
          { success: false, error: `Upload failed: ${uploadResult.error.message}` },
          { status: 500 }
        );
      }
    }

    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(uploadResult.data!.path);

    const publicUrl = urlData.publicUrl;

    // Update customer record with profile picture URL
    const { error: updateError } = await supabase
      .from("customers")
      .update({ profile_picture_url: publicUrl })
      .eq("id", customerId);

    if (updateError) {
      // Column might not exist yet — return URL anyway so the UI can display it
      return NextResponse.json({
        success: true,
        url: publicUrl,
        warning: "Image uploaded but customer record not updated. Run the SQL migration to add profile_picture_url column.",
      });
    }

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : "Unknown"}` },
      { status: 500 }
    );
  }
}
