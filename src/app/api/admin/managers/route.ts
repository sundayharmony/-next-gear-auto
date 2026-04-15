import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { auditLog } from "@/lib/security/audit-log";
import { logger } from "@/lib/utils/logger";
import { featureFlags } from "@/lib/config/feature-flags";

export async function GET(req: NextRequest) {
  if (!featureFlags.adminManagerAccessUi()) {
    return NextResponse.json({ success: false, message: "Manager access UI is disabled." }, { status: 403 });
  }
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
  if (!featureFlags.adminManagerAccessUi()) {
    return NextResponse.json({ success: false, message: "Manager access UI is disabled." }, { status: 403 });
  }
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

  const managerId = "c_" + crypto.randomUUID();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      id: managerId,
      name: name.slice(0, 100),
      email,
      phone: phone.slice(0, 20) || null,
      role: "manager",
      manager_access_enabled: true,
      manager_access_granted_at: now,
      manager_access_revoked_at: null,
    })
    .select("id, name, email, phone, role, manager_access_enabled, manager_access_granted_at, manager_access_revoked_at, created_at")
    .maybeSingle();

  if (error) {
    logger.error("Failed to create manager:", error);
    return NextResponse.json({ success: false, message: "Failed to create manager" }, { status: 500 });
  }

  auditLog("ADMIN_ACTION", {
    userId: auth.adminId,
    details: {
      action: "manager_access_granted",
      targetUserId: data?.id,
      targetEmail: data?.email,
    },
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!featureFlags.adminManagerAccessUi()) {
    return NextResponse.json({ success: false, message: "Manager access UI is disabled." }, { status: 403 });
  }
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
