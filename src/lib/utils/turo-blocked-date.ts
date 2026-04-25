export function getTuroDriverFromReason(reason: string | null | undefined): string | null {
  if (!reason) return null;
  const text = reason.trim();

  // Matches forms like:
  // "Turo: Noah"
  // "Turo (extended): Noah — $158.19"
  const match = text.match(/^Turo(?:\s*\(extended\))?\s*:\s*([^—]+?)(?:\s*—|$)/i);
  if (!match) return null;
  const name = match[1].trim();
  return name || null;
}
