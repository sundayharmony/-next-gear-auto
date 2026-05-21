import { NextResponse } from "next/server";
import type { verifyAdminOrManager } from "@/lib/auth/admin-check";
import {
  fetchCustomerManagerAccessRow,
  isManagerPanelAccessEnabled,
} from "@/lib/auth/manager-access";
import { isAdminRole, isManagerRole } from "@/lib/auth/roles";
import { getServiceSupabase } from "@/lib/db/supabase";

type AuthResult = Awaited<ReturnType<typeof verifyAdminOrManager>>;

export async function authorizeBookingInvoiceAccess(
  auth: AuthResult,
  booking: {
    origin_channel: string | null;
    created_by_user_id: string | null;
  },
  action: "preview" | "send" | "manage",
): Promise<NextResponse | null> {
  if (!auth.authorized) return auth.response;

  const verb =
    action === "send" ? "send" : action === "preview" ? "preview" : "manage";

  if (isManagerRole(auth.role)) {
    const supabase = getServiceSupabase();
    const accessRow = await fetchCustomerManagerAccessRow(supabase, auth.userId);
    if (!isManagerPanelAccessEnabled(accessRow)) {
      return NextResponse.json(
        { success: false, message: "Manager panel access is disabled" },
        { status: 403 },
      );
    }
    if (
      booking.origin_channel !== "manager_panel" ||
      booking.created_by_user_id !== auth.userId
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Managers can only ${verb} invoices for their own bookings`,
        },
        { status: 403 },
      );
    }
  } else if (!isAdminRole(auth.role)) {
    return NextResponse.json(
      { success: false, message: "Staff access required" },
      { status: 403 },
    );
  }

  return null;
}
