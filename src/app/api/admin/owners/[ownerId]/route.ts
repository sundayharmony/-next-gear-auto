import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { enrichOwnerRow } from "@/lib/admin/owner-enrichment";
import { isValidEmailFormat } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";
import { hasOwnerPortalAccess } from "@/lib/auth/customer-capabilities";

type Params = { params: Promise<{ ownerId: string }> };

/**
 * GET /api/admin/owners/[ownerId]
 * Single owner with vehicles, financial rollup, and recent bookings.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await verifyAdmin(_req);
  if (!auth.authorized) return auth.response;

  const { ownerId } = await params;
  if (!ownerId?.trim()) {
    return NextResponse.json({ success: false, message: "Invalid owner id" }, { status: 400 });
  }

  try {
    const supabase = getServiceSupabase();
    const { data: owner, error } = await supabase
      .from("customers")
      .select("id, name, email, phone, created_at, role, password_hash, owner_portal_enabled")
      .eq("id", ownerId)
      .maybeSingle();

    if (error) {
      logger.error("Admin owner GET error:", error);
      return NextResponse.json({ success: false, message: "Failed to load owner" }, { status: 500 });
    }
    if (!owner || !hasOwnerPortalAccess(owner)) {
      return NextResponse.json({ success: false, message: "Owner not found" }, { status: 404 });
    }

    const enriched = await enrichOwnerRow(owner, { recentBookingsLimit: 20 });
    return NextResponse.json(
      { success: true, data: enriched },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    logger.error("Admin owner GET error:", err);
    return NextResponse.json({ success: false, message: "Failed to load owner" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/owners/[ownerId]
 * Update owner profile (name, email, phone).
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  const { ownerId } = await params;
  if (!ownerId?.trim()) {
    return NextResponse.json({ success: false, message: "Invalid owner id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, message: "Invalid request body" }, { status: 400 });
  }

  const hasName = "name" in body;
  const hasEmail = "email" in body;
  const hasPhone = "phone" in body;
  if (!hasName && !hasEmail && !hasPhone) {
    return NextResponse.json({ success: false, message: "Provide name, email, and/or phone to update" }, { status: 400 });
  }

  try {
    const supabase = getServiceSupabase();
    const { data: existing, error: loadError } = await supabase
      .from("customers")
      .select("id, name, email, phone, role, owner_portal_enabled")
      .eq("id", ownerId)
      .maybeSingle();

    if (loadError) {
      logger.error("Owner PATCH load failed:", loadError);
      return NextResponse.json({ success: false, message: "Failed to load owner" }, { status: 500 });
    }
    if (!existing || !hasOwnerPortalAccess(existing)) {
      return NextResponse.json({ success: false, message: "Owner not found" }, { status: 404 });
    }

    const updates: Record<string, string | null> = {};

    if (hasName) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name || name.length > 100) {
        return NextResponse.json({ success: false, message: "Name must be 1–100 characters" }, { status: 400 });
      }
      updates.name = name;
    }

    if (hasPhone) {
      const phone = typeof body.phone === "string" ? body.phone.trim() : "";
      updates.phone = phone.slice(0, 20) || null;
    }

    if (hasEmail) {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      if (!email || !isValidEmailFormat(email)) {
        return NextResponse.json({ success: false, message: "Invalid email" }, { status: 400 });
      }
      if (email !== (existing.email || "").toLowerCase()) {
        const { data: other } = await supabase
          .from("customers")
          .select("id")
          .eq("email", email)
          .neq("id", ownerId)
          .maybeSingle();
        if (other) {
          return NextResponse.json({ success: false, message: "Another account already uses this email." }, { status: 409 });
        }
      }
      updates.email = email;
    }

    const { error } = await supabase.from("customers").update(updates).eq("id", ownerId);
    if (error) {
      logger.error("Owner PATCH update failed:", error);
      return NextResponse.json({ success: false, message: "Failed to update owner" }, { status: 500 });
    }

    const { data: refreshed } = await supabase
      .from("customers")
      .select("id, name, email, phone, created_at")
      .eq("id", ownerId)
      .maybeSingle();

    if (!refreshed) {
      return NextResponse.json({ success: false, message: "Owner not found" }, { status: 404 });
    }

    const enriched = await enrichOwnerRow(refreshed, { recentBookingsLimit: 20 });
    return NextResponse.json({ success: true, data: enriched, message: "Owner updated" });
  } catch (err) {
    logger.error("Owner PATCH error:", err);
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
}
