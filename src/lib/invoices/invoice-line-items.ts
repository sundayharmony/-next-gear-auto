import type { InvoiceLineItem } from "@/lib/invoices/invoice-data";
import {
  invoiceLabelFromDocumentLine,
  lineItemAmount,
  type DocumentLineItem,
} from "@/lib/documents/document-line-items";

export const MAX_ADDITIONAL_INVOICE_LINES = 15;
export const MAX_INVOICE_LINE_LABEL_LENGTH = 120;

export type AdditionalInvoiceLineItemInput = {
  label: string;
  amount: number;
  title?: string;
  description?: string;
  unitPrice?: number;
  quantity?: number;
  isCredit?: boolean;
};

function structuredRowToInput(row: Record<string, unknown>): AdditionalInvoiceLineItemInput | null {
  const title = typeof row.title === "string" ? row.title.trim() : "";
  if (!title) return null;
  const unitPrice = Number(row.unitPrice);
  const quantity = Number(row.quantity ?? 1);
  if (!Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isFinite(quantity) || quantity <= 0) {
    return null;
  }
  const item: DocumentLineItem = {
    title,
    description:
      typeof row.description === "string" ? row.description.trim() || undefined : undefined,
    unitPrice,
    quantity,
    isCredit: Boolean(row.isCredit) || undefined,
  };
  return {
    title: item.title,
    description: item.description,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    label: invoiceLabelFromDocumentLine(item).slice(0, MAX_INVOICE_LINE_LABEL_LENGTH),
    amount: lineItemAmount(item),
    isCredit: item.isCredit,
  };
}

export function sumInvoiceLineItems(items: InvoiceLineItem[]): number {
  const total = items.reduce((sum, item) => {
    const amt = Math.max(0, Number(item.amount) || 0);
    return item.isCredit ? sum - amt : sum + amt;
  }, 0);
  return Math.max(0, Math.round(total * 100) / 100);
}

export function validateAdditionalInvoiceLineItems(
  raw: unknown,
): { ok: true; items: AdditionalInvoiceLineItemInput[] } | { ok: false; message: string } {
  if (raw == null) return { ok: true, items: [] };
  if (!Array.isArray(raw)) {
    return { ok: false, message: "additionalLineItems must be an array" };
  }
  if (raw.length > MAX_ADDITIONAL_INVOICE_LINES) {
    return {
      ok: false,
      message: `At most ${MAX_ADDITIONAL_INVOICE_LINES} additional line items allowed`,
    };
  }

  const items: AdditionalInvoiceLineItemInput[] = [];

  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!row || typeof row !== "object") {
      return { ok: false, message: `Line item ${i + 1} is invalid` };
    }
    const structured = structuredRowToInput(row as Record<string, unknown>);
    if (structured) {
      items.push(structured);
      continue;
    }

    const label = typeof (row as { label?: unknown }).label === "string"
      ? (row as { label: string }).label.trim()
      : "";
    if (!label) {
      return { ok: false, message: `Line item ${i + 1} needs a title or description` };
    }
    if (label.length > MAX_INVOICE_LINE_LABEL_LENGTH) {
      return {
        ok: false,
        message: `Line item ${i + 1} description is too long (max ${MAX_INVOICE_LINE_LABEL_LENGTH} characters)`,
      };
    }

    const amount = Number((row as { amount?: unknown }).amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return { ok: false, message: `Line item ${i + 1} needs a valid amount` };
    }
    if (amount > 999_999.99) {
      return { ok: false, message: `Line item ${i + 1} amount is too large` };
    }

    const isCredit = Boolean((row as { isCredit?: unknown }).isCredit);
    items.push({
      label,
      amount: Math.round(amount * 100) / 100,
      isCredit: isCredit || undefined,
    });
  }

  return { ok: true, items };
}

export function normalizeAdditionalLineItems(
  items: AdditionalInvoiceLineItemInput[],
): InvoiceLineItem[] {
  return items.map((item) => ({
    label: item.label,
    amount: item.amount,
    isCredit: item.isCredit,
  }));
}
