import type { SupabaseClient } from "@supabase/supabase-js";
import { sendBookingInvoice } from "@/lib/email/mailer";
import { buildBookingInvoiceData } from "@/lib/invoices/invoice-data";
import { validateInvoiceDueDate } from "@/lib/invoices/invoice-due-date";
import {
  validateAdditionalInvoiceLineItems,
  type AdditionalInvoiceLineItemInput,
} from "@/lib/invoices/invoice-line-items";
import { computeInvoicePaymentStatus } from "@/lib/invoices/invoice-status";
import { getVehicleDisplayName } from "@/lib/types";
import { getBookingBalanceDue } from "@/lib/utils/recurring-booking";
import { logger } from "@/lib/utils/logger";
import { generateInvoicePdf } from "@/lib/invoices/invoice-pdf";
import { isValidEmailFormat } from "@/lib/utils/validation";
import { invoiceTableMissingMessage } from "@/lib/invoices/invoice-db-errors";

export interface DbInvoiceRow {
  id: string;
  booking_id: string;
  customer_name: string | null;
  customer_email: string | null;
  additional_line_items: AdditionalInvoiceLineItemInput[];
  line_items: { label: string; amount: number; isCredit?: boolean }[];
  charges_total: number;
  amount_paid_snapshot: number;
  balance_due_snapshot: number;
  due_date: string;
  sent_at: string | null;
  updated_at: string;
  created_at: string;
  last_sent_by: string | null;
  send_count: number;
}

export async function loadBookingWithVehicle(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<
  | { error: "not_found" | "db_error" }
  | {
      booking: Record<string, unknown>;
      vehicleName: string;
      vehicleDailyRate: number | null;
    }
> {
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingErr) {
    logger.error("Invoice booking lookup error:", bookingErr);
    return { error: "db_error" };
  }
  if (!booking) return { error: "not_found" };

  let vehicleName = "Vehicle";
  let vehicleDailyRate: number | null = null;
  const vehicleId = booking.vehicle_id as string | null;
  if (vehicleId) {
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("year, make, model, daily_rate")
      .eq("id", vehicleId)
      .maybeSingle();

    if (vehicle) {
      vehicleName = getVehicleDisplayName(vehicle);
      vehicleDailyRate =
        typeof vehicle.daily_rate === "number"
          ? vehicle.daily_rate
          : Number(vehicle.daily_rate) || null;
    }
  }

  return { booking, vehicleName, vehicleDailyRate };
}

export function buildInvoicePayload(
  booking: Record<string, unknown>,
  vehicleName: string,
  vehicleDailyRate: number | null,
  options?: {
    additionalLineItems?: AdditionalInvoiceLineItemInput[];
    dueDate?: string;
  },
) {
  const draft = buildBookingInvoiceData(
    { ...booking, vehicleName } as Parameters<typeof buildBookingInvoiceData>[0],
    { vehicleDailyRate },
  );
  const dueParsed = validateInvoiceDueDate(options?.dueDate, draft.invoiceDate);
  if (!dueParsed.ok) {
    return { ok: false as const, message: dueParsed.message };
  }

  const invoiceData = buildBookingInvoiceData(
    { ...booking, vehicleName } as Parameters<typeof buildBookingInvoiceData>[0],
    {
      vehicleDailyRate,
      additionalLineItems: options?.additionalLineItems ?? [],
      dueDate: dueParsed.dueDate,
    },
  );

  return { ok: true as const, invoiceData, additionalLineItems: options?.additionalLineItems ?? [] };
}

export async function upsertInvoiceFromBooking(
  supabase: SupabaseClient,
  bookingId: string,
  options: {
    additionalLineItems?: AdditionalInvoiceLineItemInput[];
    dueDate?: string;
    performedBy?: string;
    incrementSend?: boolean;
  },
): Promise<
  | { ok: false; message: string; code?: "not_found" | "db_error" | "validation" }
  | { ok: true; invoice: DbInvoiceRow }
> {
  const ctx = await loadBookingWithVehicle(supabase, bookingId);
  if ("error" in ctx) {
    return {
      ok: false,
      message: ctx.error === "not_found" ? "Booking not found" : "Unable to load booking",
      code: ctx.error === "not_found" ? "not_found" : "db_error",
    };
  }

  const additionalParsed = validateAdditionalInvoiceLineItems(
    options.additionalLineItems ?? [],
  );
  if (!additionalParsed.ok) {
    return { ok: false, message: additionalParsed.message, code: "validation" };
  }

  const built = buildInvoicePayload(
    ctx.booking,
    ctx.vehicleName,
    ctx.vehicleDailyRate,
    {
      additionalLineItems: additionalParsed.items,
      dueDate: options.dueDate,
    },
  );
  if (!built.ok) {
    return { ok: false, message: built.message, code: "validation" };
  }

  const { invoiceData } = built;
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("invoices")
    .select("id, send_count")
    .eq("booking_id", bookingId)
    .maybeSingle();

  const row = {
    booking_id: bookingId,
    customer_name: invoiceData.customerName,
    customer_email: invoiceData.customerEmail,
    additional_line_items: additionalParsed.items,
    line_items: invoiceData.lineItems,
    charges_total: invoiceData.chargesTotal,
    amount_paid_snapshot: invoiceData.amountPaid,
    balance_due_snapshot: invoiceData.balanceDue,
    due_date: invoiceData.dueDate,
    updated_at: now,
    ...(options.incrementSend
      ? {
          sent_at: now,
          last_sent_by: options.performedBy ?? null,
          send_count: (existing?.send_count ?? 0) + 1,
        }
      : {}),
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from("invoices")
      .update(row)
      .eq("id", existing.id)
      .select("*")
      .single();

  if (error) {
    logger.error("Invoice update error:", error);
    const missing = invoiceTableMissingMessage(error);
    return {
      ok: false,
      message: missing ?? "Failed to save invoice",
      code: "db_error",
    };
  }
    return { ok: true, invoice: data as DbInvoiceRow };
  }

  const id = `inv_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const { data, error } = await supabase
    .from("invoices")
    .insert({
      id,
      ...row,
      send_count: options.incrementSend ? 1 : 0,
      sent_at: options.incrementSend ? now : null,
      last_sent_by: options.incrementSend ? options.performedBy ?? null : null,
      created_at: now,
    })
    .select("*")
    .single();

  if (error) {
    logger.error("Invoice insert error:", error);
    const missing = invoiceTableMissingMessage(error);
    return {
      ok: false,
      message: missing ?? "Failed to save invoice",
      code: "db_error",
    };
  }

  return { ok: true, invoice: data as DbInvoiceRow };
}

export async function sendInvoiceEmail(
  supabase: SupabaseClient,
  invoiceId: string,
  performedBy: string,
): Promise<
  | { ok: false; message: string; code?: "not_found" | "db_error" | "validation" }
  | { ok: true; message: string; balanceDue: number; hadPdf: boolean }
> {
  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invErr) {
    logger.error("Invoice load error:", invErr);
    return { ok: false, message: "Unable to load invoice", code: "db_error" };
  }
  if (!invoice) {
    return { ok: false, message: "Invoice not found", code: "not_found" };
  }

  const ctx = await loadBookingWithVehicle(supabase, invoice.booking_id);
  if ("error" in ctx) {
    return {
      ok: false,
      message: ctx.error === "not_found" ? "Booking not found" : "Unable to load booking",
      code: ctx.error === "not_found" ? "not_found" : "db_error",
    };
  }

  const customerEmail = (ctx.booking.customer_email as string | null)?.trim() || "";
  if (!customerEmail || !isValidEmailFormat(customerEmail)) {
    return { ok: false, message: "Booking has no valid customer email", code: "validation" };
  }

  const additional = (invoice.additional_line_items ?? []) as AdditionalInvoiceLineItemInput[];
  const built = buildInvoicePayload(ctx.booking, ctx.vehicleName, ctx.vehicleDailyRate, {
    additionalLineItems: additional,
    dueDate: invoice.due_date,
  });
  if (!built.ok) {
    return { ok: false, message: built.message, code: "validation" };
  }

  const { invoiceData } = built;

  const upsert = await upsertInvoiceFromBooking(supabase, invoice.booking_id, {
    additionalLineItems: additional,
    dueDate: invoice.due_date,
    performedBy,
    incrementSend: true,
  });
  if (!upsert.ok) {
    return { ok: false, message: upsert.message, code: upsert.code };
  }

  let pdfBytes: Uint8Array | undefined;
  try {
    pdfBytes = await generateInvoicePdf(invoiceData);
    if (pdfBytes.length > 10 * 1024 * 1024) {
      pdfBytes = undefined;
    }
  } catch (pdfErr) {
    logger.warn("Invoice PDF generation failed, sending HTML only:", pdfErr);
  }

  try {
    await sendBookingInvoice({
      ...invoiceData,
      customerEmail,
      pdfBytes,
    });
  } catch (mailErr) {
    logger.error("Invoice email send failed after save:", mailErr);
    return {
      ok: false,
      message: "Invoice saved but email failed to send. Try Save & re-send from Invoices.",
      code: "db_error",
    };
  }

  await supabase.from("booking_activity").insert({
    booking_id: invoice.booking_id,
    action: "invoice_sent",
    details: {
      to: customerEmail,
      balance_due: invoiceData.balanceDue,
      charges_total: invoiceData.chargesTotal,
      had_pdf: !!pdfBytes,
      additional_line_items: additional.length > 0 ? additional : undefined,
      due_date: invoiceData.dueDate,
      invoice_id: invoiceId,
    },
    performed_by: performedBy,
  });

  return {
    ok: true,
    message: `Invoice sent to ${customerEmail}`,
    balanceDue: invoiceData.balanceDue,
    hadPdf: !!pdfBytes,
  };
}

export function enrichInvoiceWithBooking(
  invoice: DbInvoiceRow,
  booking: Record<string, unknown> | null,
  vehicleName?: string,
) {
  const liveBalance = booking ? getBookingBalanceDue(booking as Parameters<typeof getBookingBalanceDue>[0]) : invoice.balance_due_snapshot;
  const status = booking
    ? computeInvoicePaymentStatus(booking as Parameters<typeof computeInvoicePaymentStatus>[0], invoice.due_date)
    : computeInvoicePaymentStatus({ deposit: invoice.amount_paid_snapshot, total_price: invoice.charges_total }, invoice.due_date);

  return {
    ...invoice,
    vehicleName: vehicleName ?? "Vehicle",
    liveBalance,
    paymentStatus: status,
  };
}

export async function backfillInvoicesFromActivity(
  supabase: SupabaseClient,
): Promise<{ created: number; updated: number; skipped: number }> {
  const { data: activities, error } = await supabase
    .from("booking_activity")
    .select("booking_id, details, created_at, performed_by")
    .eq("action", "invoice_sent")
    .order("created_at", { ascending: true });

  if (error) {
    logger.error("Backfill activity fetch error:", error);
    throw new Error("Failed to load invoice activity");
  }

  const latestByBooking = new Map<
    string,
    { details: Record<string, unknown>; created_at: string; performed_by: string | null }
  >();

  for (const row of activities ?? []) {
    if (!row.booking_id) continue;
    latestByBooking.set(row.booking_id, {
      details: (row.details as Record<string, unknown>) ?? {},
      created_at: row.created_at,
      performed_by: row.performed_by,
    });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const [bookingId, activity] of latestByBooking) {
    const ctx = await loadBookingWithVehicle(supabase, bookingId);
    if ("error" in ctx) {
      skipped++;
      continue;
    }

    const additional = validateAdditionalInvoiceLineItems(
      activity.details.additional_line_items,
    );
    const items = additional.ok ? additional.items : [];

    const dueDate =
      typeof activity.details.due_date === "string"
        ? activity.details.due_date
        : undefined;

    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("booking_id", bookingId)
      .maybeSingle();

    const result = await upsertInvoiceFromBooking(supabase, bookingId, {
      additionalLineItems: items,
      dueDate,
    });

    if (!result.ok) {
      skipped++;
      continue;
    }

    const { count } = await supabase
      .from("booking_activity")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", bookingId)
      .eq("action", "invoice_sent");

    await supabase
      .from("invoices")
      .update({
        sent_at: activity.created_at,
        last_sent_by: activity.performed_by,
        send_count: count ?? 1,
        created_at: activity.created_at,
      })
      .eq("booking_id", bookingId);

    if (existing?.id) updated++;
    else created++;
  }

  return { created, updated, skipped };
}
