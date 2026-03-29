/**
 * Parses Turo booking confirmation email text to extract trip details.
 *
 * Turo emails typically contain:
 * - Vehicle info (year, make, model)
 * - Trip start date/time
 * - Trip end date/time
 * - Guest name
 * - Trip total/earnings
 *
 * This parser handles multiple possible email formats since Turo
 * may change their email templates over time.
 */

export interface TuroEmailParseResult {
  guestName: string | null;
  vehicleDescription: string | null;
  startDate: string | null;  // YYYY-MM-DD
  endDate: string | null;    // YYYY-MM-DD
  earnings: number | null;
  confidence: "high" | "medium" | "low";
  rawMatches: string[];      // Debug info showing what was matched
}

/**
 * Parse raw email text (plain text or stripped HTML) for Turo booking info.
 */
export function parseTuroEmail(emailText: string): TuroEmailParseResult {
  const text = stripHtml(emailText);
  const rawMatches: string[] = [];

  // ── Extract dates ──
  // Look for patterns like:
  // "Trip starts: Mon, Apr 5, 2026 at 10:00 AM"
  // "Trip start: April 5, 2026"
  // "Check-in: 04/05/2026"
  // "Start date: 2026-04-05"
  // "Apr 5 – Apr 8, 2026"
  // "April 5 - April 8"
  let startDate: string | null = null;
  let endDate: string | null = null;

  // Pattern 1: "Trip starts: <date>" / "Trip ends: <date>"
  const tripStartMatch = text.match(/trip\s+start[s]?\s*[:–—-]\s*(.+?)(?:\n|$)/i);
  const tripEndMatch = text.match(/trip\s+end[s]?\s*[:–—-]\s*(.+?)(?:\n|$)/i);
  if (tripStartMatch) {
    startDate = parseFlexibleDate(tripStartMatch[1]);
    rawMatches.push(`Trip start: "${tripStartMatch[1].trim()}"`);
  }
  if (tripEndMatch) {
    endDate = parseFlexibleDate(tripEndMatch[1]);
    rawMatches.push(`Trip end: "${tripEndMatch[1].trim()}"`);
  }

  // Pattern 2: "Start date: <date>" / "End date: <date>"
  if (!startDate) {
    const startDateMatch = text.match(/start\s+date\s*[:–—-]\s*(.+?)(?:\n|$)/i);
    if (startDateMatch) {
      startDate = parseFlexibleDate(startDateMatch[1]);
      rawMatches.push(`Start date: "${startDateMatch[1].trim()}"`);
    }
  }
  if (!endDate) {
    const endDateMatch = text.match(/end\s+date\s*[:–—-]\s*(.+?)(?:\n|$)/i);
    if (endDateMatch) {
      endDate = parseFlexibleDate(endDateMatch[1]);
      rawMatches.push(`End date: "${endDateMatch[1].trim()}"`);
    }
  }

  // Pattern 3: "Check-in: <date>" / "Check-out: <date>"
  if (!startDate) {
    const checkinMatch = text.match(/check[\s-]*in\s*[:–—-]\s*(.+?)(?:\n|$)/i);
    if (checkinMatch) {
      startDate = parseFlexibleDate(checkinMatch[1]);
      rawMatches.push(`Check-in: "${checkinMatch[1].trim()}"`);
    }
  }
  if (!endDate) {
    const checkoutMatch = text.match(/check[\s-]*out\s*[:–—-]\s*(.+?)(?:\n|$)/i);
    if (checkoutMatch) {
      endDate = parseFlexibleDate(checkoutMatch[1]);
      rawMatches.push(`Check-out: "${checkoutMatch[1].trim()}"`);
    }
  }

  // Pattern 4: Date range like "Apr 5 – Apr 8, 2026" or "04/05/2026 - 04/08/2026"
  if (!startDate || !endDate) {
    const rangeMatch = text.match(
      /(\w+\.?\s+\d{1,2}(?:,?\s+\d{4})?)\s*[–—-]+\s*(\w+\.?\s+\d{1,2}(?:,?\s+\d{4})?)/
    );
    if (rangeMatch) {
      const s = parseFlexibleDate(rangeMatch[1]);
      const e = parseFlexibleDate(rangeMatch[2]);
      if (s && !startDate) { startDate = s; rawMatches.push(`Range start: "${rangeMatch[1].trim()}"`); }
      if (e && !endDate) { endDate = e; rawMatches.push(`Range end: "${rangeMatch[2].trim()}"`); }
    }

    // Numeric date range: "04/05/2026 - 04/08/2026" or "2026-04-05 to 2026-04-08"
    const numRangeMatch = text.match(
      /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\s*[–—to-]+\s*(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/i
    );
    if (numRangeMatch) {
      const s = parseFlexibleDate(numRangeMatch[1]);
      const e = parseFlexibleDate(numRangeMatch[2]);
      if (s && !startDate) { startDate = s; rawMatches.push(`Numeric range start: "${numRangeMatch[1]}"`); }
      if (e && !endDate) { endDate = e; rawMatches.push(`Numeric range end: "${numRangeMatch[2]}"`); }
    }
  }

  // ── Extract guest name ──
  let guestName: string | null = null;
  const guestPatterns = [
    /(?:guest|booked by|renter|driver)\s*[:–—-]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z.]+)?)/i,
    /([A-Z][a-z]+(?:\s+[A-Z]\.?))\s+(?:booked|has booked|reserved|wants to book)/i,
    /trip\s+with\s+([A-Z][a-z]+(?:\s+[A-Z][a-z.]+)?)/i,
    /new\s+(?:booking|reservation|trip)\s+(?:from|by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z.]+)?)/i,
  ];
  for (const pattern of guestPatterns) {
    const match = text.match(pattern);
    if (match) {
      guestName = match[1].trim();
      rawMatches.push(`Guest: "${guestName}"`);
      break;
    }
  }

  // ── Extract vehicle description ──
  let vehicleDescription: string | null = null;
  // Look for year + make + model patterns
  const vehiclePatterns = [
    /(\d{4})\s+(Toyota|Honda|Nissan|BMW|Mercedes|Audi|Ford|Chevrolet|Chevy|Hyundai|Kia|Jeep|Tesla|Volkswagen|VW|Ram|RAM|Dodge|Subaru|Mazda|Lexus|Acura|Infiniti|Volvo|Porsche|Cadillac|Lincoln|Buick|GMC|Chrysler)[- ](\w+(?:\s+\w+)?)/i,
    /vehicle\s*[:–—-]\s*(.+?)(?:\n|$)/i,
    /car\s*[:–—-]\s*(.+?)(?:\n|$)/i,
  ];
  for (const pattern of vehiclePatterns) {
    const match = text.match(pattern);
    if (match) {
      vehicleDescription = match[0].includes(":") ? match[1].trim() : `${match[1]} ${match[2]} ${match[3] || ""}`.trim();
      rawMatches.push(`Vehicle: "${vehicleDescription}"`);
      break;
    }
  }

  // ── Extract earnings/price ──
  let earnings: number | null = null;
  const earningsPatterns = [
    /(?:you(?:'ll)?\s+earn|earnings?|trip\s+earnings?|host\s+earnings?|payout|total)\s*[:–—-]?\s*\$?([\d,]+(?:\.\d{2})?)/i,
    /\$([\d,]+(?:\.\d{2})?)\s+(?:earned|earnings|payout|total)/i,
  ];
  for (const pattern of earningsPatterns) {
    const match = text.match(pattern);
    if (match) {
      earnings = parseFloat(match[1].replace(/,/g, ""));
      rawMatches.push(`Earnings: $${earnings}`);
      break;
    }
  }

  // ── Determine confidence ──
  let confidence: "high" | "medium" | "low" = "low";
  if (startDate && endDate && vehicleDescription) {
    confidence = "high";
  } else if (startDate && endDate) {
    confidence = "medium";
  } else if (startDate || endDate) {
    confidence = "low";
  }

  return {
    guestName,
    vehicleDescription,
    startDate,
    endDate,
    earnings,
    confidence,
    rawMatches,
  };
}

/**
 * Strip HTML tags and decode common entities.
 */
function stripHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .replace(/ \n/g, "\n")
    .trim();
}

/**
 * Parse a wide variety of date formats into YYYY-MM-DD.
 */
function parseFlexibleDate(dateStr: string): string | null {
  const s = dateStr.trim().replace(/\s+at\s+.*/i, "").replace(/\s+\d{1,2}:\d{2}\s*(AM|PM)?/i, "").trim();

  // ISO format: 2026-04-05
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // US format: 04/05/2026 or 4/5/2026
  const usMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    return `${usMatch[3]}-${usMatch[1].padStart(2, "0")}-${usMatch[2].padStart(2, "0")}`;
  }

  // Named month: "Apr 5, 2026", "April 5 2026", "5 Apr 2026"
  const months: Record<string, string> = {
    jan: "01", january: "01", feb: "02", february: "02", mar: "03", march: "03",
    apr: "04", april: "04", may: "05", jun: "06", june: "06",
    jul: "07", july: "07", aug: "08", august: "08", sep: "09", september: "09",
    oct: "10", october: "10", nov: "11", november: "11", dec: "12", december: "12",
  };

  // "Apr 5, 2026" or "April 5 2026"
  const namedMatch = s.match(/^(\w+)\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (namedMatch) {
    const m = months[namedMatch[1].toLowerCase()];
    if (m) return `${namedMatch[3]}-${m}-${namedMatch[2].padStart(2, "0")}`;
  }

  // "5 Apr 2026"
  const namedMatch2 = s.match(/^(\d{1,2})\s+(\w+)\.?,?\s+(\d{4})$/);
  if (namedMatch2) {
    const m = months[namedMatch2[2].toLowerCase()];
    if (m) return `${namedMatch2[3]}-${m}-${namedMatch2[1].padStart(2, "0")}`;
  }

  // "Apr 5" (no year — assume current year)
  const noYearMatch = s.match(/^(\w+)\.?\s+(\d{1,2})$/);
  if (noYearMatch) {
    const m = months[noYearMatch[1].toLowerCase()];
    if (m) return `${new Date().getFullYear()}-${m}-${noYearMatch[2].padStart(2, "0")}`;
  }

  // "Monday, Apr 5, 2026" — strip day name
  const withDayName = s.replace(/^(?:mon|tue|wed|thu|fri|sat|sun)\w*,?\s*/i, "");
  if (withDayName !== s) return parseFlexibleDate(withDayName);

  // Fallback: try Date.parse
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2020) {
    return parsed.toISOString().split("T")[0];
  }

  return null;
}
