import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { loadOwnerDataset } from "@/lib/owner/owner-data";
import { isRevenueBooking, clampPercentage } from "@/lib/owner/finance";
import { isValidEmailFormat } from "@/lib/utils/validation";
import { validatePassword } from "@/lib/auth/password-policy";
import { logger } from "@/lib/utils/logger";
import bcrypt from "bcryptjs";

/**
 * GET /api/admin/owners
 * List owner accounts with their vehicle count and earnings rollup.
 */
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const { data: owners, error } = await supabase
      .from("customers")
      .select("id, name, email, phone, created_at")
      .eq("role", "owner")
      .order("name", { ascending: true });

    if (error) {
      logger.error("Admin owners GET error:", error);
      return NextResponse.json({ success: false, message: "Failed to load owners" }, { status: 500 });
    }

    const enriched = await Promise.all(
      (owners || []).map(async (o) => {
        const { vehicles, bookings } = await loadOwnerDataset(o.id);
        let lifetimeRevenue = 0;
        let lifetimePayouts = 0;
        let pendingPayouts = 0;
        for (const b of bookings) {
          if (b.status === "cancelled" || !isRevenueBooking(b.rawStatus)) continue;
          lifetimeRevenue += b.grossRevenue;
          if (b.payoutStatus === "paid") lifetimePayouts += b.ownerPayout;
          else if (b.status === "completed") pendingPayouts += b.ownerPayout;
        }
        return {
          id: o.id,
          name: o.name,
          email: o.email,
          phone: o.phone || "",
          createdAt: o.created_at,
          vehicleCount: vehicles.length,
          vehicles,
          lifetimeRevenue: Math.round(lifetimeRevenue * 100) / 100,
          lifetimePayouts: Math.round(lifetimePayouts * 100) / 100,
          pendingPayouts: Math.round(pendingPayouts * 100) / 100,
        };
      })
    );

    return NextResponse.json(
      { success: true, data: enriched },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    logger.error("Admin owners GET error:", err);
    return NextResponse.json({ success: false, message: "Failed to load owners" }, { status: 500 });
  }
}

/**
 * POST /api/admin/owners
 * Create a new owner account or promote an existing customer to owner.
 * Body: { name, email, password?, phone? }
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const body = await req.json();
    const name = (body.name || "").trim().slice(0, 100);
    const email = (body.email || "").toLowerCase().trim();
    const phone = (body.phone || "").trim().slice(0, 20);
    const password = body.password;

    if (!name || !email) {
      return NextResponse.json({ success: false, message: "Name and email are required" }, { status: 400 });
    }
    if (!isValidEmailFormat(email)) {
      return NextResponse.json({ success: false, message: "Invalid email format" }, { status: 400 });
    }

    let passwordHash: string | undefined;
    if (password) {
      const pwCheck = validatePassword(password);
      if (!pwCheck.valid) {
        return NextResponse.json({ success: false, message: pwCheck.message }, { status: 400 });
      }
      passwordHash = await bcrypt.hash(password, 12);
    }

    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      const updates: Record<string, string> = { role: "owner", name };
      if (phone) updates.phone = phone;
      if (passwordHash) updates.password_hash = passwordHash;
      const { error } = await supabase.from("customers").update(updates).eq("id", existing.id);
      if (error) {
        logger.error("Promote owner error:", error);
        return NextResponse.json({ success: false, message: "Failed to update owner" }, { status: 500 });
      }
      return NextResponse.json({ success: true, data: { id: existing.id }, message: "Existing account promoted to owner" });
    }

    const id = "c_" + crypto.randomUUID();
    const { error } = await supabase.from("customers").insert({
      id,
      name,
      email,
      phone,
      role: "owner",
      ...(passwordHash ? { password_hash: passwordHash } : {}),
    });
    if (error) {
      logger.error("Create owner error:", error);
      return NextResponse.json({ success: false, message: "Failed to create owner" }, { status: 500 });
    }
    return NextResponse.json({ success: true, data: { id }, message: "Owner created" }, { status: 201 });
  } catch (err) {
    logger.error("Admin owners POST error:", err);
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
}

/**
 * PATCH /api/admin/owners
 * Assign / unassign a vehicle to an owner and set the owner revenue %.
 * Body: { vehicleId, ownerId | null, ownerPercentage? }
 */
export async function PATCH(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const body = await req.json();
    const { vehicleId } = body;

    if (!vehicleId) {
      return NextResponse.json({ success: false, message: "vehicleId is required" }, { status: 400 });
    }

    const updates: Record<string, string | number | null> = {};

    if ("ownerId" in body) {
      const ownerId = body.ownerId;
      if (ownerId === null || ownerId === "") {
        updates.owner_id = null;
      } else {
        const { data: owner } = await supabase
          .from("customers")
          .select("id, role")
          .eq("id", ownerId)
          .maybeSingle();
        if (!owner || owner.role !== "owner") {
          return NextResponse.json({ success: false, message: "Target is not an owner account" }, { status: 400 });
        }
        updates.owner_id = ownerId;
      }
    }

    if (body.ownerPercentage !== undefined) {
      const pct = Number(body.ownerPercentage);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        return NextResponse.json({ success: false, message: "ownerPercentage must be between 0 and 100" }, { status: 400 });
      }
      updates.owner_percentage = clampPercentage(pct);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, message: "No changes provided" }, { status: 400 });
    }

    const { error } = await supabase.from("vehicles").update(updates).eq("id", vehicleId);
    if (error) {
      logger.error("Assign owner error:", error);
      return NextResponse.json({ success: false, message: "Failed to update vehicle assignment" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Vehicle assignment updated" });
  } catch (err) {
    logger.error("Admin owners PATCH error:", err);
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
}
