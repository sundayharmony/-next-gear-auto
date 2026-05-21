import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import {
  fetchCustomerManagerAccessRow,
  isManagerPanelAccessEnabled,
} from "@/lib/auth/manager-access";
import { isAdminRole, isManagerRole } from "@/lib/auth/roles";
import {
  AgreementSigningError,
  completeAgreementSigning,
  validateAgreementSignatures,
} from "@/lib/agreement/complete-agreement-signing";
import { logger } from "@/lib/utils/logger";

export async function POST(req: NextRequest) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON" },
        { status: 400 },
      );
    }

    const { bookingId, signatures } = body as {
      bookingId?: string;
      signatures?: Record<string, unknown>;
    };

    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: "bookingId is required" },
        { status: 400 },
      );
    }

    try {
      validateAgreementSignatures(signatures);
    } catch (err) {
      if (err instanceof AgreementSigningError) {
        return NextResponse.json(
          { success: false, message: err.message },
          { status: err.status },
        );
      }
      throw err;
    }

    const supabase = getServiceSupabase();
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingErr) {
      logger.error("In-person sign booking lookup error:", bookingErr);
      return NextResponse.json(
        { success: false, message: "Unable to load booking" },
        { status: 500 },
      );
    }

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 },
      );
    }

    if (isManagerRole(auth.role)) {
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
          { success: false, message: "Managers can only sign agreements for their own bookings" },
          { status: 403 },
        );
      }
    } else if (!isAdminRole(auth.role)) {
      return NextResponse.json(
        { success: false, message: "Staff access required" },
        { status: 403 },
      );
    }

    const { data: staff } = await supabase
      .from("customers")
      .select("email")
      .eq("id", auth.userId)
      .maybeSingle();

    const performedBy = staff?.email || auth.userId;

    const result = await completeAgreementSigning(bookingId, signatures!, {
      performedBy,
      channel: "in_person",
    });

    return NextResponse.json({
      success: true,
      message: "Agreement signed in person",
      data: {
        url: result.url,
        signedAt: result.signedAt,
        agreement_signed_at: result.signedAt,
        rental_agreement_url: result.url,
        signed_name: booking.customer_name,
      },
    });
  } catch (error) {
    if (error instanceof AgreementSigningError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status },
      );
    }
    logger.error("In-person agreement sign error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to sign agreement" },
      { status: 500 },
    );
  }
}
