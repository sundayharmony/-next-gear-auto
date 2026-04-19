import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { auditLog } from "@/lib/security/audit-log";
import { logger } from "@/lib/utils/logger";

type Params = { params: Promise<{ managerId: string }> };

function isRoleConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === "23514" && (candidate.message || "").includes("customers_role_check");
}

function schemaMismatchResponse() {
  return NextResponse.json(
    {
      success: false,
      message:
        "Database schema is outdated: customers_role_check does not allow manager role yet. Run the manager attribution migration in Supabase and try again.",
    },
    { status: 409 }
  );
}

const SELECT_FIELDS =
  "id, name, email, phone, role, manager_access_enabled, manager_access_granted_at, manager_access_revoked_at, created_at";

/**
 * Update a manager's profile (name, email, phone). Target row must have role = manager.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  const { managerId } = await params;
  if (!managerId?.trim()) {
    return NextResponse.json({ success: false, message: "Invalid manager id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, message: "Invalid request body" }, { status: 400 });
  }

  const nameRaw = body.name;
  const emailRaw = body.email;
  const phoneRaw = body.phone;

  const hasName = "name" in body;
  const hasEmail = "email" in body;
  const hasPhone = "phone" in body;

  if (!hasName && !hasEmail && !hasPhone) {
    return NextResponse.json({ success: false, message: "Provide name, email, and/or phone to update" }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  const { data: existing, error: loadError } = await supabase
    .from("customers")
    .select("id, name, email, phone, role")
    .eq("id", managerId)
    .maybeSingle();

  if (loadError) {
    logger.error("Manager PATCH load failed:", loadError);
    return NextResponse.json({ success: false, message: "Failed to load manager" }, { status: 500 });
  }

  if (!existing || existing.role !== "manager") {
    return NextResponse.json({ success: false, message: "Manager not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};

  if (hasName) {
    const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
    if (!name || name.length > 100) {
      return NextResponse.json({ success: false, message: "Name must be 1–100 characters" }, { status: 400 });
    }
    updates.name = name;
  }

  if (hasPhone) {
    const phone = typeof phoneRaw === "string" ? phoneRaw.trim() : "";
    updates.phone = phone.slice(0, 20) || null;
  }

  if (hasEmail) {
    const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email) || email.length > 255) {
      return NextResponse.json({ success: false, message: "Invalid email" }, { status: 400 });
    }

    if (email !== (existing.email || "").toLowerCase()) {
      const { data: adminHit } = await supabase.from("admins").select("id").eq("email", email).maybeSingle();
      if (adminHit) {
        return NextResponse.json(
          { success: false, message: "This email is already used by an admin account." },
          { status: 409 }
        );
      }
      const { data: otherCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("email", email)
        .neq("id", managerId)
        .maybeSingle();
      if (otherCustomer) {
        return NextResponse.json(
          { success: false, message: "Another account already uses this email." },
          { status: 409 }
        );
      }
    }
    updates.email = email;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: false, message: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("customers")
    .update(updates)
    .eq("id", managerId)
    .eq("role", "manager")
    .select(SELECT_FIELDS)
    .maybeSingle();

  if (error) {
    logger.error("Manager PATCH update failed:", error);
    if (isRoleConstraintError(error)) {
      return schemaMismatchResponse();
    }
    return NextResponse.json({ success: false, message: "Failed to update manager" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ success: false, message: "Manager not found" }, { status: 404 });
  }

  auditLog("ADMIN_ACTION", {
    userId: auth.adminId,
    details: {
      action: "manager_updated",
      targetUserId: managerId,
      fields: Object.keys(updates),
    },
  });

  return NextResponse.json({ success: true, data });
}

/**
 * Remove manager role: demote to customer and revoke panel access (same as revoking access).
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  const { managerId } = await params;
  if (!managerId?.trim()) {
    return NextResponse.json({ success: false, message: "Invalid manager id" }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  const { data: existing, error: loadError } = await supabase
    .from("customers")
    .select("id, role, email")
    .eq("id", managerId)
    .maybeSingle();

  if (loadError) {
    logger.error("Manager DELETE load failed:", loadError);
    return NextResponse.json({ success: false, message: "Failed to load manager" }, { status: 500 });
  }

  if (!existing || existing.role !== "manager") {
    return NextResponse.json({ success: false, message: "Manager not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("customers")
    .update({
      manager_access_enabled: false,
      manager_access_revoked_at: now,
      role: "customer",
    })
    .eq("id", managerId)
    .select(SELECT_FIELDS)
    .maybeSingle();

  if (error) {
    logger.error("Manager DELETE (demote) failed:", error);
    if (isRoleConstraintError(error)) {
      return schemaMismatchResponse();
    }
    return NextResponse.json({ success: false, message: "Failed to remove manager" }, { status: 500 });
  }

  auditLog("ADMIN_ACTION", {
    userId: auth.adminId,
    details: {
      action: "manager_removed",
      targetUserId: managerId,
      targetEmail: existing.email,
    },
  });

  return NextResponse.json({ success: true, data, message: "Manager removed. Account is now a customer." });
}
