/**
 * Lightweight iCal (.ics) parser for extracting VEVENT date ranges.
 * No external dependencies — parses the iCal text format directly.
 */

export interface ICalEvent {
  uid: string;
  summary: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD (exclusive in iCal DATE type, we convert to inclusive)
  status?: string;
}

/**
 * Parse an iCal (.ics) string into an array of events.
 * Only extracts VEVENT components with DATE or DATETIME start/end.
 */
export function parseICal(icsText: string): ICalEvent[] {
  const events: ICalEvent[] = [];

  // Unfold continuation lines (RFC 5545 §3.1: lines starting with space/tab are continuations)
  const unfolded = icsText.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  let inEvent = false;
  let uid = "";
  let summary = "";
  let dtstart = "";
  let dtend = "";
  let status = "";

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "BEGIN:VEVENT") {
      inEvent = true;
      uid = "";
      summary = "";
      dtstart = "";
      dtend = "";
      status = "";
      continue;
    }

    if (trimmed === "END:VEVENT") {
      if (inEvent && dtstart) {
        const startDate = parseICalDate(dtstart);
        let endDate = dtend ? parseICalDate(dtend) : startDate;

        if (startDate) {
          // iCal DATE values use exclusive end dates — subtract 1 day for inclusive range
          // But DATETIME values are already precise, so only adjust for DATE-only values
          if (dtend && isDateOnly(dtend) && endDate) {
            endDate = subtractOneDay(endDate);
            // If end < start after adjustment (single-day event), use start
            if (endDate < startDate) endDate = startDate;
          }

          events.push({
            uid: uid || `generated-${startDate}-${Math.random().toString(36).slice(2, 8)}`,
            summary: summary || "Blocked",
            startDate,
            endDate: endDate || startDate,
            status: status || undefined,
          });
        }
      }
      inEvent = false;
      continue;
    }

    if (!inEvent) continue;

    // Parse properties (handle ;params before :value)
    if (trimmed.startsWith("UID:")) {
      uid = trimmed.slice(4).trim();
    } else if (trimmed.startsWith("SUMMARY:")) {
      summary = trimmed.slice(8).trim();
    } else if (trimmed.startsWith("STATUS:")) {
      status = trimmed.slice(7).trim();
    } else if (trimmed.startsWith("DTSTART")) {
      dtstart = extractValue(trimmed);
    } else if (trimmed.startsWith("DTEND")) {
      dtend = extractValue(trimmed);
    }
  }

  return events;
}

/**
 * Extract the value part from an iCal property line.
 * Handles both "DTSTART:20240315" and "DTSTART;VALUE=DATE:20240315"
 */
function extractValue(line: string): string {
  const colonIdx = line.indexOf(":");
  return colonIdx !== -1 ? line.slice(colonIdx + 1).trim() : "";
}

/**
 * Check if an iCal date value is DATE-only (no time component).
 * DATE: 20240315 (8 digits)
 * DATETIME: 20240315T120000 or 20240315T120000Z
 */
function isDateOnly(value: string): boolean {
  const raw = extractValue(`X:${value}`) || value;
  // Pure 8-digit date with no T
  return /^\d{8}$/.test(raw.replace(/\D/g, "").slice(0, 8)) && !raw.includes("T");
}

/**
 * Parse an iCal date/datetime string into YYYY-MM-DD format.
 * Supports: 20240315, 20240315T120000, 20240315T120000Z
 */
function parseICalDate(value: string): string | null {
  // Strip everything except digits and T/Z
  const clean = value.replace(/[^0-9TZ]/g, "");
  const match = clean.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

/**
 * Subtract one day from a YYYY-MM-DD string.
 */
function subtractOneDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z"); // Use noon to avoid DST issues
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split("T")[0];
}
