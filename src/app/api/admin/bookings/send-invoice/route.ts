import { NextRequest, NextResponse } from "next/server";

import { getServiceSupabase } from "@/lib/db/supabase";

import { verifyAdminOrManager } from "@/lib/auth/admin-check";

import { authorizeBookingInvoiceAccess } from "@/lib/invoices/invoice-auth";

import { validateAdditionalInvoiceLineItems } from "@/lib/invoices/invoice-line-items";

import {

  loadBookingWithVehicle,

  sendInvoiceEmail,

  upsertInvoiceFromBooking,

} from "@/lib/invoices/invoice-service";

import { logger } from "@/lib/utils/logger";

import { isValidEmailFormat } from "@/lib/utils/validation";



const BOOKING_ID_RE = /^bk[0-9a-f]{7}$/i;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;



export async function POST(req: NextRequest) {

  const auth = await verifyAdminOrManager(req);

  if (!auth.authorized) return auth.response;



  try {

    let body: { bookingId?: string; additionalLineItems?: unknown; dueDate?: string };

    try {

      body = await req.json();

    } catch {

      return NextResponse.json(

        { success: false, message: "Invalid JSON body" },

        { status: 400 },

      );

    }



    const bookingId = typeof body.bookingId === "string" ? body.bookingId.trim() : "";

    const additionalParsed = validateAdditionalInvoiceLineItems(body.additionalLineItems);

    if (!additionalParsed.ok) {

      return NextResponse.json(

        { success: false, message: additionalParsed.message },

        { status: 400 },

      );

    }

    if (!bookingId || (!BOOKING_ID_RE.test(bookingId) && !UUID_RE.test(bookingId))) {

      return NextResponse.json(

        { success: false, message: "Valid bookingId is required" },

        { status: 400 },

      );

    }



    const supabase = getServiceSupabase();

    const ctx = await loadBookingWithVehicle(supabase, bookingId);

    if ("error" in ctx) {

      return NextResponse.json(

        {

          success: false,

          message: ctx.error === "not_found" ? "Booking not found" : "Unable to load booking",

        },

        { status: ctx.error === "not_found" ? 404 : 500 },

      );

    }



    const denied = await authorizeBookingInvoiceAccess(

      auth,

      ctx.booking as { origin_channel: string | null; created_by_user_id: string | null },

      "send",

    );

    if (denied) return denied;



    const customerEmail = ((ctx.booking.customer_email as string) || "").trim();

    if (!customerEmail || !isValidEmailFormat(customerEmail)) {

      return NextResponse.json(

        { success: false, message: "Booking has no valid customer email" },

        { status: 400 },

      );

    }



    const upsert = await upsertInvoiceFromBooking(supabase, bookingId, {

      additionalLineItems: additionalParsed.items,

      dueDate: body.dueDate,

    });

    if (!upsert.ok) {

      const status =

        upsert.code === "not_found" ? 404 : upsert.code === "validation" ? 400 : 500;

      return NextResponse.json({ success: false, message: upsert.message }, { status });

    }



    const { data: staff } = await supabase

      .from("customers")

      .select("email")

      .eq("id", auth.userId)

      .maybeSingle();



    const performedBy = staff?.email || auth.userId;

    const send = await sendInvoiceEmail(supabase, upsert.invoice.id, performedBy);

    if (!send.ok) {

      const status =

        send.code === "not_found" ? 404 : send.code === "validation" ? 400 : 500;

      return NextResponse.json({ success: false, message: send.message }, { status });

    }



    return NextResponse.json({

      success: true,

      message: send.message,

      data: {

        invoiceId: upsert.invoice.id,

        balanceDue: send.balanceDue,

        hadPdf: send.hadPdf,

      },

    });

  } catch (error) {

    logger.error("Send invoice error:", error);

    return NextResponse.json(

      { success: false, message: "Failed to send invoice" },

      { status: 500 },

    );

  }

}

