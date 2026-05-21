import { getBookingBalanceDue } from "@/lib/utils/recurring-booking";

export type InvoicePaymentStatus = "paid" | "overdue" | "partial" | "unpaid";

export function computeInvoicePaymentStatus(
  booking: {
    total_price?: number | null;
    deposit?: number | null;
    effective_total_price?: number | null;
    admin_notes?: string | null;
    pickup_date?: string;
  },
  dueDate: string,
  now = new Date(),
): InvoicePaymentStatus {
  const balance = getBookingBalanceDue(booking);
  if (balance <= 0) return "paid";

  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (dueDate < today) return "overdue";

  const deposit = Math.max(0, Number(booking.deposit) || 0);
  if (deposit > 0) return "partial";

  return "unpaid";
}

export const INVOICE_STATUS_LABELS: Record<InvoicePaymentStatus, string> = {
  paid: "Paid",
  overdue: "Overdue",
  partial: "Partial",
  unpaid: "Unpaid",
};

export const INVOICE_STATUS_COLORS: Record<InvoicePaymentStatus, string> = {
  paid: "bg-green-100 text-green-700 border-green-200",
  overdue: "bg-red-100 text-red-700 border-red-200",
  partial: "bg-amber-100 text-amber-700 border-amber-200",
  unpaid: "bg-gray-100 text-gray-700 border-gray-200",
};
