export const MAX_DOCUMENT_LINE_ITEMS = 25;
export const MAX_LINE_TITLE_LENGTH = 120;
export const MAX_LINE_DESCRIPTION_LENGTH = 500;

export type DocumentLineItem = {
  title: string;
  description?: string;
  unitPrice: number;
  quantity: number;
  isCredit?: boolean;
};

export function lineItemAmount(item: DocumentLineItem): number {
  const qty = Math.max(0, Number(item.quantity) || 0);
  const price = Math.max(0, Number(item.unitPrice) || 0);
  const raw = qty * price;
  return Math.round(raw * 100) / 100;
}

export function sumDocumentLineItems(items: DocumentLineItem[]): number {
  const total = items.reduce((sum, item) => {
    const amt = lineItemAmount(item);
    return item.isCredit ? sum - amt : sum + amt;
  }, 0);
  return Math.max(0, Math.round(total * 100) / 100);
}

export function validateDocumentLineItems(
  raw: unknown
): { ok: true; items: DocumentLineItem[] } | { ok: false; message: string } {
  if (raw == null) return { ok: true, items: [] };
  if (!Array.isArray(raw)) return { ok: false, message: "lineItems must be an array" };
  if (raw.length > MAX_DOCUMENT_LINE_ITEMS) {
    return { ok: false, message: `At most ${MAX_DOCUMENT_LINE_ITEMS} line items allowed` };
  }

  const items: DocumentLineItem[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!row || typeof row !== "object") {
      return { ok: false, message: `Line item ${i + 1} is invalid` };
    }
    const title =
      typeof (row as { title?: unknown }).title === "string"
        ? (row as { title: string }).title.trim()
        : "";
    if (!title) {
      return { ok: false, message: `Line item ${i + 1} needs a title` };
    }
    if (title.length > MAX_LINE_TITLE_LENGTH) {
      return { ok: false, message: `Line item ${i + 1} title is too long` };
    }
    const description =
      typeof (row as { description?: unknown }).description === "string"
        ? (row as { description: string }).description.trim()
        : undefined;
    if (description && description.length > MAX_LINE_DESCRIPTION_LENGTH) {
      return { ok: false, message: `Line item ${i + 1} description is too long` };
    }
    const unitPrice = Number((row as { unitPrice?: unknown }).unitPrice);
    const quantity = Number((row as { quantity?: unknown }).quantity);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return { ok: false, message: `Line item ${i + 1} needs a valid price` };
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { ok: false, message: `Line item ${i + 1} needs quantity of at least 1` };
    }
    const isCredit = Boolean((row as { isCredit?: unknown }).isCredit);
    items.push({
      title,
      description: description || undefined,
      unitPrice: Math.round(unitPrice * 100) / 100,
      quantity: Math.round(quantity * 100) / 100,
      isCredit: isCredit || undefined,
    });
  }
  return { ok: true, items };
}

export function invoiceLabelFromDocumentLine(item: DocumentLineItem): string {
  const qty = item.quantity === 1 ? "" : ` × ${item.quantity}`;
  const base = item.description ? `${item.title} — ${item.description}` : item.title;
  return `${base}${qty}`.trim();
}
