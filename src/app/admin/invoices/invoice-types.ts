import type { InvoicePaymentStatus } from "@/lib/invoices/invoice-status";
import type { AdditionalInvoiceLineItemInput } from "@/lib/invoices/invoice-line-items";
import {
  draftsFromLineItems,
  draftsToLineItems,
  emptyDocumentLineDraft,
  type DocumentLineItemDraft,
} from "@/components/admin/document-line-items-editor";
import type { DocumentLineItem } from "@/lib/documents/document-line-items";

export type DraftLine = DocumentLineItemDraft;

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
  return emptyDocumentLineDraft();
}

function additionalToDocumentLine(item: AdditionalInvoiceLineItemInput): DocumentLineItem {
  if (item.title) {
    return {
      title: item.title,
      description: item.description,
      unitPrice: item.unitPrice ?? item.amount,
      quantity: item.quantity ?? 1,
      isCredit: item.isCredit,
    };
  }
  return {
    title: item.label,
    description: "",
    unitPrice: item.amount,
    quantity: 1,
    isCredit: item.isCredit,
  };
}

export function parseDraftLines(drafts: DraftLine[]): AdditionalInvoiceLineItemInput[] {
  const lines = draftsToLineItems(drafts);
  return lines.map((line) => {
    const qty = line.quantity;
    const label =
      line.description && line.description.trim()
        ? `${line.title} — ${line.description}`
        : line.title;
    const amount = Math.round(line.unitPrice * qty * 100) / 100;
    return {
      title: line.title,
      description: line.description,
      unitPrice: line.unitPrice,
      quantity: qty,
      label: qty === 1 ? label : `${label} × ${qty}`,
      amount,
      isCredit: line.isCredit,
    };
  });
}

export function draftsFromAdditional(items: AdditionalInvoiceLineItemInput[]): DraftLine[] {
  if (!items.length) return [emptyDraft()];
  return draftsFromLineItems(items.map(additionalToDocumentLine));
}

export function fmt(n: number): string {
  return `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}
