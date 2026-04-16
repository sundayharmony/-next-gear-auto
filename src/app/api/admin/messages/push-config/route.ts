import { NextRequest, NextResponse } from "next/server";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { isStaffMessagingEnabled } from "@/lib/config/feature-flags";

export async function GET(req: NextRequest) {
  if (!isStaffMessagingEnabled("staffMessagingPushEnabled")) {
    return NextResponse.json({ success: false, message: "Push messaging is disabled" }, { status: 403 });
  }
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;

  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ success: false, message: "WEB_PUSH_VAPID_PUBLIC_KEY is not configured" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      publicKey,
    },
  });
}
