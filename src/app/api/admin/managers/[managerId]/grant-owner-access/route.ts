import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { auditLog } from "@/lib/security/audit-log";
import { logger } from "@/lib/utils/logger";
import { isManagerRole } from "@/lib/auth/roles";
import {
  grantOwnerPortalAccess,
  grantOwnerPortalSuccessMessage,
} from "@/lib/admin/grant-owner-portal-access";

type Params = { params: Promise<{ managerId: string }> };

/**
 * POST /api/admin/managers/[managerId]/grant-owner-access
 * Grant owner portal access to a manager without removing manager panel access.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const auth = await verifyAdmin(_req);
  if (!auth.authorized) return auth.response;

  const { managerId } = await params;
  if (!managerId?.trim()) {
    return NextResponse.json({ success: false, message: "Invalid manager id" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data: manager, error: loadError } = await supabase
    .from("customers")
    .select("id, email, role")
    .eq("id", managerId)
    .maybeSingle();

  if (loadError) {
    logger.error("Grant owner access load failed:", loadError);
    return NextResponse.json({ success: false, message: "Failed to load manager" }, { status: 500 });
  }

  if (!manager || !isManagerRole(manager.role)) {
    return NextResponse.json({ success: false, message: "Manager not found" }, { status: 404 });
  }

  const result = await grantOwnerPortalAccess(supabase, managerId);
  if (!result.ok) {
    return NextResponse.json({ success: false, message: result.message }, { status: result.status });
  }

  auditLog("ADMIN_ACTION", {
    userId: auth.adminId,
    details: {
      action: "manager_granted_owner_access",
      targetUserId: managerId,
      targetEmail: manager.email,
      alreadyHadAccess: result.alreadyHadAccess,
    },
  });

  return NextResponse.json({
    success: true,
    message: grantOwnerPortalSuccessMessage(result),
    data: { ownerPortalEnabled: true },
  });
}
