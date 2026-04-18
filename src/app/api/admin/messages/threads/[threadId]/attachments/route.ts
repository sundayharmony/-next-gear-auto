import { NextRequest, NextResponse } from "next/server";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";
import { requireActiveMembership } from "@/lib/messaging/service";
import { staffMessagingMasterEnabled } from "@/lib/config/staff-messaging-server";

type Params = { params: Promise<{ threadId: string }> };

const BUCKET = "staff-message-attachments";
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Ensures the public bucket exists (idempotent). Called on each upload so the first
 * staff photo upload works without a manual Supabase dashboard step.
 */
async function ensureStaffMessageAttachmentsBucket(
  supabase: ReturnType<typeof getServiceSupabase>
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    logger.error("Staff message attachments: listBuckets failed", listError);
    return { ok: false, message: "Storage is unavailable. Try again." };
  }
  if (buckets?.some((b) => b.name === BUCKET)) {
    return { ok: true };
  }

  const { error: createError } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
  });
  if (createError) {
    const msg = (createError.message || "").toLowerCase();
    // Race: another request may have created it
    if (!msg.includes("already") && !msg.includes("exists")) {
      logger.error("Staff message attachments: createBucket failed", createError);
      return { ok: false, message: createError.message || "Could not create attachment bucket" };
    }
  }
  return { ok: true };
}

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;
  if (!staffMessagingMasterEnabled()) {
    return NextResponse.json({ success: false, message: "Staff messaging is disabled" }, { status: 403 });
  }

  const { threadId } = await params;
  const supabase = getServiceSupabase();

  const member = await requireActiveMembership(supabase, threadId, auth.userId);
  if (!member) {
    return NextResponse.json({ success: false, message: "Thread access denied" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { success: false, message: "Invalid file type. Use JPG, PNG, WebP, or GIF." },
      { status: 400 }
    );
  }

  const nameExt = file.name.split(".").pop()?.toLowerCase() || "";
  const extMimeMap: Record<string, string[]> = {
    jpg: ["image/jpeg"],
    jpeg: ["image/jpeg"],
    png: ["image/png"],
    webp: ["image/webp"],
    gif: ["image/gif"],
  };
  if (!extMimeMap[nameExt] || !extMimeMap[nameExt].includes(file.type)) {
    return NextResponse.json({ success: false, message: "File extension does not match content type" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ success: false, message: "Image too large. Maximum 5MB." }, { status: 400 });
  }

  const extByMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  const fileExt = extByMime[file.type] || "jpg";
  const fileName = `${threadId}/${crypto.randomUUID()}.${fileExt}`;

  try {
    const ensured = await ensureStaffMessageAttachmentsBucket(supabase);
    if (!ensured.ok) {
      return NextResponse.json({ success: false, message: ensured.message }, { status: 500 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await supabase.storage.from(BUCKET).upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadResult.error || !uploadResult.data?.path) {
      logger.error("Staff message attachment upload failed", uploadResult.error);
      return NextResponse.json(
        { success: false, message: uploadResult.error?.message || "Upload failed" },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(uploadResult.data.path);
    const publicUrl = urlData.publicUrl;

    return NextResponse.json({ success: true, url: publicUrl, messagingEnabled: true });
  } catch (error) {
    logger.error("Staff message attachment error", error);
    return NextResponse.json({ success: false, message: "Upload failed" }, { status: 500 });
  }
}
