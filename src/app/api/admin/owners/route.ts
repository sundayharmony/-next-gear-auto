import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { enrichOwnerRow } from "@/lib/admin/owner-enrichment";
import { clampPercentage, DEFAULT_OWNER_PERCENTAGE } from "@/lib/owner/finance";
import { isCompanyOwnedOwnerId } from "@/lib/owner/ownership";
import { hasOwnerPortalAccess } from "@/lib/auth/customer-capabilities";
import {
  fetchVehiclesForOwnerAssignments,
  patchVehicleAssignment,
  vehicleSupportsCompanyOwnedFlag,
} from "@/lib/admin/vehicle-assignment-db";
import { isMissingColumnError } from "@/lib/utils/supabase-column-errors";
import { isValidEmailFormat } from "@/lib/utils/validation";
import { validatePassword, PASSWORD_REQUIREMENTS } from "@/lib/auth/password-policy";
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

    let ownersQuery = await supabase
      .from("customers")
      .select("id, name, email, phone, created_at, password_hash, role, owner_portal_enabled")
      .or("role.eq.owner,owner_portal_enabled.eq.true")
      .order("name", { ascending: true });

    if (ownersQuery.error && isMissingColumnError(ownersQuery.error)) {
      ownersQuery = await supabase
        .from("customers")
        .select("id, name, email, phone, created_at, password_hash, role")
        .eq("role", "owner")
        .order("name", { ascending: true });
    }

    const { data: owners, error: ownersError } = ownersQuery;
    if (ownersError) {
      logger.error("Admin owners GET error:", ownersError);
      return NextResponse.json({ success: false, message: "Failed to load owners" }, { status: 500 });
    }

    const [vehicleResult, enriched] = await Promise.all([
      fetchVehiclesForOwnerAssignments(supabase),
      Promise.all((owners || []).map((o) => enrichOwnerRow(o, { recentBookingsLimit: 0 }))),
    ]);
    const vehicleRows = vehicleResult.rows;

    const vehicleAssignments: Record<
      string,
      { ownerId: string | null; isCompanyOwned: boolean; ownerPercentage: number }
    > = {};
    for (const v of vehicleRows) {
      const isCompanyOwned = v.is_company_owned === true;
      vehicleAssignments[v.id as string] = {
        ownerId: isCompanyOwned ? null : ((v.owner_id as string | null) ?? null),
        isCompanyOwned,
        ownerPercentage: clampPercentage(
          Number(v.owner_percentage) || DEFAULT_OWNER_PERCENTAGE
        ),
      };
    }

    return NextResponse.json(
      {
        success: true,
        data: enriched,
        vehicleAssignments,
        meta: { supportsCompanyOwned: vehicleResult.supportsCompanyOwned },
      },
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
    const password = typeof body.password === "string" ? body.password.trim() : "";

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
        return NextResponse.json(
          { success: false, message: pwCheck.message, requirements: PASSWORD_REQUIREMENTS },
          { status: 400 }
        );
      }
      passwordHash = await bcrypt.hash(password, 12);
    }

    const { data: existing } = await supabase
      .from("customers")
      .select("id, role")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      const updates: Record<string, string | boolean> = {
        name,
        owner_portal_enabled: true,
      };
      if (existing.role !== "manager") {
        updates.role = "owner";
      }
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
      owner_portal_enabled: true,
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
 * Body: { vehicleId, ownerId | null | "__company__", ownerPercentage? }
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

    const supportsCompanyOwned = await vehicleSupportsCompanyOwnedFlag(supabase);
    const updates: Record<string, string | number | boolean | null> = {};
    let assigningCompany = false;

    if ("ownerId" in body) {
      const ownerId = body.ownerId;
      if (isCompanyOwnedOwnerId(ownerId) || body.isCompanyOwned === true) {
        if (!supportsCompanyOwned) {
          return NextResponse.json(
            {
              success: false,
              message:
                "“Company owned” requires a database update. In Supabase SQL Editor, run supabase-company-owned-vehicles.sql, then try again.",
            },
            { status: 400 }
          );
        }
        updates.owner_id = null;
        updates.is_company_owned = true;
        updates.owner_percentage = 0;
        assigningCompany = true;
      } else if (ownerId === null || ownerId === "") {
        updates.owner_id = null;
        if (supportsCompanyOwned) updates.is_company_owned = false;
      } else {
        let ownerQuery = await supabase
          .from("customers")
          .select("id, role, owner_portal_enabled")
          .eq("id", ownerId)
          .maybeSingle();
        if (ownerQuery.error && isMissingColumnError(ownerQuery.error)) {
          ownerQuery = await supabase
            .from("customers")
            .select("id, role")
            .eq("id", ownerId)
            .eq("role", "owner")
            .maybeSingle();
        }
        const owner = ownerQuery.data;
        if (!owner || !hasOwnerPortalAccess(owner)) {
          return NextResponse.json({ success: false, message: "Target is not an owner account" }, { status: 400 });
        }
        updates.owner_id = ownerId;
        if (supportsCompanyOwned) updates.is_company_owned = false;
      }
    }

    if (body.ownerPercentage !== undefined && !assigningCompany) {
      if (!("ownerId" in body) && supportsCompanyOwned) {
        const { data: current } = await supabase
          .from("vehicles")
          .select("is_company_owned")
          .eq("id", vehicleId)
          .maybeSingle();
        if (current?.is_company_owned) {
          return NextResponse.json(
            { success: false, message: "Company-owned vehicles have no external owner share" },
            { status: 400 }
          );
        }
      }
      const pct = Number(body.ownerPercentage);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        return NextResponse.json({ success: false, message: "ownerPercentage must be between 0 and 100" }, { status: 400 });
      }
      updates.owner_percentage = clampPercentage(pct);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, message: "No changes provided" }, { status: 400 });
    }

    const { error, companyOwnedUnsupported } = await patchVehicleAssignment(
      supabase,
      vehicleId,
      updates
    );
    if (error) {
      logger.error("Assign owner error:", error);
      const status = companyOwnedUnsupported ? 400 : 500;
      const hint =
        companyOwnedUnsupported || isMissingColumnError(error)
          ? " Run supabase-company-owned-vehicles.sql in Supabase SQL Editor."
          : "";
      const detail = error.message ? ` (${error.message})` : "";
      return NextResponse.json(
        {
          success: false,
          message: (error.message || "Failed to update vehicle assignment") + detail + hint,
        },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Vehicle assignment updated",
      ...(companyOwnedUnsupported
        ? { warning: "Company owned flag is not in the database yet; saved owner assignment only." }
        : {}),
    });
  } catch (err) {
    logger.error("Admin owners PATCH error:", err);
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
}
