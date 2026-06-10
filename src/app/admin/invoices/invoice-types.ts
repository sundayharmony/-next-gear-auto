import type { InvoicePaymentStatus } from "@/lib/invoices/invoice-status";
import type { AdditionalInvoiceLineItemInput } from "@/lib/invoices/invoice-line-items";

export type DraftLine = {
  id: string;
  label: string;
  amount: string;
  isCredit: boolean;
};

export type InvoiceListRow = {
  id: string;
  booking_id: string;
  customer_name: string | null;
  customer_email: string | null;
  charges_total: number;
  balance_due_snapshot: number;
  due_date: string;
  sent_at: string | null;
  send_count: number;
  vehicleName: string;
  liveBalance: number;
  paymentStatus: InvoicePaymentStatus;
};

export type SendHistoryRow = {
  id: string;
  created_at: string;
  performed_by: string | null;
  details: Record<string, unknown>;
};

export type InvoiceDetail = InvoiceListRow & {
  additional_line_items: AdditionalInvoiceLineItemInput[];
  line_items: { label: string; amount: number; isCredit?: boolean }[];
  amount_paid_snapshot: number;
  sendHistory: SendHistoryRow[];
};

export function emptyDraft(): DraftLine {
  return { id: crypto.randomUUID(), label: "", amount: "", isCredit: false };
}

export function parseDraftLines(drafts: DraftLine[]): AdditionalInvoiceLineItemInput[] {
  return drafts
    .map((d) => ({
      label: d.label.trim(),
      amount: Number.parseFloat(d.amount),
      isCredit: d.isCredit || undefined,
    }))
    .filter((d) => d.label && Number.isFinite(d.amount) && d.amount >= 0);
}

export function draftsFromAdditional(items: AdditionalInvoiceLineItemInput[]): DraftLine[] {
  if (!items.length) return [emptyDraft()];
  return items.map((item) => ({
    id: crypto.randomUUID(),
    label: item.label,
    amount: String(item.amount),
    isCredit: !!item.isCredit,
  }));
}

export function fmt(n: number): string {
  return `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}
