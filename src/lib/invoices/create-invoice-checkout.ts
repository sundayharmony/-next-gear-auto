import Stripe from "stripe";
import { logger } from "@/lib/utils/logger";

export interface CreateInvoiceCheckoutInput {
  invoiceId: string;
  bookingId: string;
  customerEmail: string;
  vehicleName: string;
  balanceDue: number;
  dueDate: string;
  customerId?: string | null;
  vehicleId?: string | null;
}

export type CreateInvoiceCheckoutResult =
  | { ok: true; paymentUrl: string; stripeSessionId: string }
  | { ok: false; message: string };

function getStripe(): Stripe {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey?.trim()) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(stripeKey);
}

/** Create a Stripe Checkout Session for an invoice balance due. */
export async function createInvoiceCheckoutSession(
  input: CreateInvoiceCheckoutInput,
): Promise<CreateInvoiceCheckoutResult> {
  if (!(input.balanceDue > 0)) {
    return { ok: false, message: "No balance due to collect" };
  }
  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return { ok: false, message: "Payment processing is not configured" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rentnextgearauto.com";
  const amountCents = Math.max(1, Math.round(input.balanceDue * 100));

  try {
    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card", "cashapp", "link"],
      mode: "payment",
      customer_email: input.customerEmail,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "NextGearAuto — Invoice balance",
              description: `${input.vehicleName} · Invoice #${input.invoiceId.slice(0, 8)} · Due ${input.dueDate}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: input.bookingId,
        invoice_id: input.invoiceId,
        purpose: "invoice",
        customer_id: input.customerId || "",
        vehicle_id: input.vehicleId || "",
        balance_due: input.balanceDue.toFixed(2),
      },
      success_url: `${siteUrl}/account?invoice_paid=1&booking_id=${encodeURIComponent(input.bookingId)}`,
      cancel_url: `${siteUrl}/account`,
      // Stripe Checkout Sessions expire within 24 hours.
      expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    });

    if (!session.url) {
      logger.error("Invoice checkout session missing URL", { sessionId: session.id });
      return { ok: false, message: "Failed to create payment link" };
    }

    return {
      ok: true,
      paymentUrl: session.url,
      stripeSessionId: session.id,
    };
  } catch (err) {
    logger.error("Invoice Stripe checkout creation failed:", err);
    return { ok: false, message: "Failed to create payment session" };
  }
}
