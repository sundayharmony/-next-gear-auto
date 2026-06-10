import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/jwt";
import { getServiceSupabase } from "@/lib/db/supabase";
import { tokenHasOwnerAccess } from "@/lib/auth/roles";
import {
  CUSTOMER_CAPABILITIES_SELECT,
  hasOwnerPortalAccess,
} from "@/lib/auth/customer-capabilities";

export type OwnerAuthResult =
  | { authorized: true; ownerId: string; email: string }
  | { authorized: false; response: NextResponse };

/**
 * Verify the request comes from an authenticated vehicle owner.
 * Returns the owner's id (always taken from the JWT — never trusted from the
 * client) so every owner endpoint can scope queries to that owner only.
 */
export async function verifyOwner(req: NextRequest): Promise<OwnerAuthResult> {
  const tokenPayload = await getAuthFromRequest(req);
  if (!tokenPayload || !tokenHasOwnerAccess(tokenPayload)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, message: "Owner access required" },
        { status: 403 }
      ),
    };
  }
  return { authorized: true, ownerId: tokenPayload.sub, email: tokenPayload.email };
}

/** Owner auth with DB check that owner portal access has not been revoked. */
export async function verifyOwnerWithPortalAccess(req: NextRequest): Promise<OwnerAuthResult> {
  const auth = await verifyOwner(req);
  if (!auth.authorized) return auth;

  try {
    const supabase = getServiceSupabase();
    const { data: customer } = await supabase
      .from("customers")
      .select(CUSTOMER_CAPABILITIES_SELECT)
      .eq("id", auth.ownerId)
      .maybeSingle();

    if (!hasOwnerPortalAccess(customer)) {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, message: "Owner portal access has been revoked." },
          { status: 403 }
        ),
      };
    }
    return auth;
  } catch {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, message: "Authentication failed" },
        { status: 500 }
      ),
    };
  }
}

/**
 * Return the set of vehicle ids that belong to an owner. Scales to many
 * vehicles per owner via the idx_vehicles_owner_id index.
 */
export async function getOwnerVehicleIds(ownerId: string): Promise<string[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("vehicles")
    .select("id")
    .eq("owner_id", ownerId);
  if (error || !data) return [];
  return data.map((v) => v.id as string);
}
