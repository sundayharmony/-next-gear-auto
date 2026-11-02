const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Public document code: exactly 6 characters (no ambiguous 0/O/1/I). */
export function generateShortDocumentCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Visible invoice/incident number is never longer than 6 characters. */
export function displayDocumentNumber(id: string): string {
  const suffix = id.replace(/^(inv_|inc_)/i, "").replace(/[^a-zA-Z0-9]/g, "");
  if (!suffix) return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase() || "------";
  return suffix.slice(-6).toUpperCase();
}

export const INVOICE_ID_RE = /^inv_[a-z0-9]{6,32}$/i;
