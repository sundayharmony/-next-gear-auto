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
      "Pay online with the Stripe checkout link included in this email (and on the PDF when a link was generated). The link expires 24 hours after send.",
      "If amounts remain unpaid after that date, they may be pursued under your rental agreement, including collection efforts and remedies available under New Jersey law.",
    ];
  }
  return [
    "This invoice reflects no balance due at this time. Thank you for your business.",
  ];
}
