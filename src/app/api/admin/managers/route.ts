import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { auditLog } from "@/lib/security/audit-log";
import { logger } from "@/lib/utils/logger";
import { sendPasswordResetLink } from "@/lib/email/mailer";

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

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, email, phone, role, manager_access_enabled, manager_access_granted_at, manager_access_revoked_at, created_at")
    .eq("role", "manager")
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Failed to list managers:", error);
    return NextResponse.json({ success: false, message: "Failed to list managers" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data || [] });
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  const supabase = getServiceSupabase();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, message: "Invalid request body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (!name || !email) {
    return NextResponse.json({ success: false, message: "Name and email are required" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ success: false, message: "Invalid email format" }, { status: 400 });
  }

  const { data: adminWithEmail, error: adminLookupError } = await supabase
    .from("admins")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (adminLookupError) {
    logger.error("Failed to check admin email collision:", adminLookupError);
    return NextResponse.json({ success: false, message: "Failed to create manager" }, { status: 500 });
  }

  if (adminWithEmail) {
    return NextResponse.json(
      { success: false, message: "This email belongs to an admin account and cannot be used for a manager." },
      { status: 409 }
    );
  }

  const { data: existingCustomer, error: existingLookupError } = await supabase
    .from("customers")
    .select("id, name, email, phone, role, password_hash, manager_access_enabled, manager_access_granted_at, manager_access_revoked_at, created_at")
    .eq("email", email)
    .maybeSingle();

  if (existingLookupError) {
    logger.error("Failed to check existing customer for manager creation:", existingLookupError);
    return NextResponse.json({ success: false, message: "Failed to create manager" }, { status: 500 });
  }

  const now = new Date().toISOString();
  let data: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    manager_access_enabled: boolean;
    manager_access_granted_at: string | null;
    manager_access_revoked_at: string | null;
    created_at?: string;
  } | null = null;
  let inviteMessage = "";

  if (existingCustomer) {
    const { data: updated, error: updateError } = await supabase
      .from("customers")
      .update({
        name: name.slice(0, 100),
        phone: phone.slice(0, 20) || existingCustomer.phone || null,
        role: "manager",
        manager_access_enabled: true,
        manager_access_granted_at: now,
        manager_access_revoked_at: null,
      })
      .eq("id", existingCustomer.id)
      .select("id, name, email, phone, role, manager_access_enabled, manager_access_granted_at, manager_access_revoked_at, created_at")
      .maybeSingle();

    if (updateError) {
      logger.error("Failed to promote existing customer to manager:", updateError);
      if (isRoleConstraintError(updateError)) {
        return schemaMismatchResponse();
      }
      return NextResponse.json({ success: false, message: "Failed to create manager" }, { status: 500 });
    }
    data = updated;

    if (!existingCustomer.password_hash) {
      try {
        await sendPasswordResetLink({
          customerName: updated?.name || name,
          customerEmail: email,
        });
        inviteMessage = " Existing account promoted and set-password link sent.";
      } catch (emailError) {
        logger.error("Manager promoted but failed to send set-password link:", emailError);
        inviteMessage = " Existing account promoted, but failed to send set-password link.";
      }
    } else {
      inviteMessage = " Existing account promoted. Current password still works.";
    }
  } else {
    const managerId = "c_" + crypto.randomUUID();
    const { data: inserted, error: insertError } = await supabase
      .from("customers")
      .insert({
        id: managerId,
        name: name.slice(0, 100),
        email,
        phone: phone.slice(0, 20) || null,
        dob: "",
        role: "manager",
        manager_access_enabled: true,
        manager_access_granted_at: now,
        manager_access_revoked_at: null,
      })
      .select("id, name, email, phone, role, manager_access_enabled, manager_access_granted_at, manager_access_revoked_at, created_at")
      .maybeSingle();

    if (insertError) {
      logger.error("Failed to create manager:", insertError);
      if (isRoleConstraintError(insertError)) {
        return schemaMismatchResponse();
      }
      return NextResponse.json({ success: false, message: "Failed to create manager" }, { status: 500 });
    }
    data = inserted;

    try {
      await sendPasswordResetLink({
        customerName: inserted?.name || name,
        customerEmail: email,
      });
      inviteMessage = " Set-password link sent.";
    } catch (emailError) {
      logger.error("Manager created but failed to send set-password link:", emailError);
      inviteMessage = " Manager created, but failed to send set-password link.";
    }
  }

  auditLog("ADMIN_ACTION", {
    userId: auth.adminId,
    details: {
      action: "manager_access_granted",
      targetUserId: data?.id,
      targetEmail: data?.email,
    },
  });

  return NextResponse.json(
    { success: true, data, message: `Manager access created.${inviteMessage}`.trim() },
    { status: existingCustomer ? 200 : 201 }
  );
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  const supabase = getServiceSupabase();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, message: "Invalid request body" }, { status: 400 });
  }

  const managerId = typeof body.managerId === "string" ? body.managerId : "";
  const enabled = Boolean(body.enabled);
  if (!managerId) {
    return NextResponse.json({ success: false, message: "managerId is required" }, { status: 400 });
  }

  const updates = enabled
    ? {
      manager_access_enabled: true,
      manager_access_granted_at: new Date().toISOString(),
      manager_access_revoked_at: null,
      role: "manager",
    }
    : {
      manager_access_enabled: false,
      manager_access_revoked_at: new Date().toISOString(),
      role: "customer",
    };

  const { data, error } = await supabase
    .from("customers")
    .update(updates)
    .eq("id", managerId)
    .select("id, name, email, phone, role, manager_access_enabled, manager_access_granted_at, manager_access_revoked_at, created_at")
    .maybeSingle();

  if (error) {
    logger.error("Failed to update manager access:", error);
    if (isRoleConstraintError(error)) {
      return schemaMismatchResponse();
    }
    return NextResponse.json({ success: false, message: "Failed to update manager access" }, { status: 500 });
  }

  auditLog("ADMIN_ACTION", {
    userId: auth.adminId,
    details: {
      action: enabled ? "manager_access_granted" : "manager_access_revoked",
      targetUserId: managerId,
    },
  });

  return NextResponse.json({ success: true, data });
}
