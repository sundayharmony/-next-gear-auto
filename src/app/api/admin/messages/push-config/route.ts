import { NextRequest, NextResponse } from "next/server";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { staffMessagingPushChannelEnabled } from "@/lib/config/staff-messaging-server";

export async function GET(req: NextRequest) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;

  if (!staffMessagingPushChannelEnabled()) {
    return NextResponse.json({
      success: true,
      data: { publicKey: null as string | null, pushEnabled: false },
    });
  }

  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({
      success: true,
      data: { publicKey: null as string | null, pushEnabled: false, reason: "WEB_PUSH_VAPID_PUBLIC_KEY is not configured" },
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      publicKey,
      pushEnabled: true,
    },
  });
}
