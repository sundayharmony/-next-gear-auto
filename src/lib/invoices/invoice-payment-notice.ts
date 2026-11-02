import { formatInvoiceDisplayDate } from "@/lib/invoices/invoice-due-date";

/** Shared invoice payment / collection notice (email + PDF). */
export function getInvoicePaymentNoticeParagraphs(
  balanceDue: number,
  dueDateIso: string,
): string[] {
  if (balanceDue > 0) {
    const dueLabel = formatInvoiceDisplayDate(dueDateIso);
    return [
      `Payment of the balance due shown above is required by ${dueLabel}.`,
      "Use the Pay balance now button in this email for a secure Stripe checkout link (valid for 24 hours from send).",
      "If amounts remain unpaid after that date, they may be pursued under your rental agreement, including collection efforts and remedies available under New Jersey law.",
    ];
  }
  return [
    "This invoice reflects no balance due at this time. Thank you for your business.",
  ];
}
