/** Shared invoice payment / collection notice (email + PDF). */
export function getInvoicePaymentNoticeParagraphs(balanceDue: number): string[] {
  if (balanceDue > 0) {
    return [
      "Payment of the balance due shown above is required when due per this invoice.",
      "If amounts remain unpaid, they may be pursued under your rental agreement, including collection efforts and remedies available under New Jersey law.",
    ];
  }
  return [
    "This invoice reflects no balance due at this time. Thank you for your business.",
  ];
}
