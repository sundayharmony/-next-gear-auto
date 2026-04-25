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
  pickupTime: string | null; // HH:MM 24-hour format, e.g. "08:00"
  returnTime: string | null; // HH:MM 24-hour format, e.g. "22:00"
  location: string | null;   // e.g. "Newark, NJ Newark Liberty International Airport"
  earnings: number | null;
  isExtension: boolean;           // true if this is a trip extension/modification email
  originalEndDate: string | null; // previous end date before extension, if extractable
  confidence: "high" | "medium" | "low";
  rawMatches: string[];      // Debug info showing what was matched
}

/**
 * Parse raw email text (plain text or stripped HTML) for Turo booking info.
 */
export function parseTuroEmail(emailText: string): TuroEmailParseResult {
  const text = stripHtml(emailText);
  const rawMatches: string[] = [];

  // ── Detect extension / modification emails ──
  let isExtension = false;
  let originalEndDate: string | null = null;

  const extensionPatterns = [
    /trip\s+(?:has\s+been\s+)?(?:extended|modified|changed|updated)/i,
    /(?:extended|modified|changed|updated)\s+(?:your\s+)?trip/i,
    /extension\s+(?:confirmed|approved|accepted)/i,
    /checkout\s+(?:date|time)\s+(?:has\s+been\s+)?(?:changed|updated|extended)/i,
    /return\s+(?:date|time)\s+(?:has\s+been\s+)?(?:changed|updated|extended)/i,
    /trip\s+modification/i,
    /booking\s+(?:has\s+been\s+)?(?:modified|updated|changed)/i,
    /new\s+(?:checkout|return|end)\s+date/i,
  ];

  for (const pattern of extensionPatterns) {
    if (pattern.test(text)) {
      isExtension = true;
      const m = text.match(pattern);
      if (m) rawMatches.push(`Extension detected: "${m[0]}"`);
      break;
    }
  }

  // Try to extract the original end date from extension emails
  if (isExtension) {
    const originalDatePatterns = [
      /(?:originally|previously)\s+(?:scheduled\s+)?(?:to\s+)?(?:end|return|checkout)\s+(?:on\s+)?(.+?)(?:\.|,|\n|$)/i,
      /(?:original|previous)\s+(?:end|return|checkout)\s+date\s*[:–—-]\s*(.+?)(?:\n|$)/i,
      /(?:was|were)\s+(?:scheduled\s+)?(?:from\s+.+?\s+)?(?:to|until|through)\s+(.+?)(?:\.|,|\n|Now|$)/i,
      /(?:changed|extended|moved)\s+from\s+.+?\s+to\s+(.+?)(?:\s+to\s+|\.|,|\n|$)/i,
    ];
    for (const pattern of originalDatePatterns) {
      const match = text.match(pattern);
      if (match) {
        originalEndDate = parseFlexibleDate(match[1]);
        if (originalEndDate) {
          rawMatches.push(`Original end date: "${originalEndDate}"`);
          break;
        }
      }
    }
  }

  // ── Extract pickup/return times ──
  let pickupTime: string | null = null;
  let returnTime: string | null = null;

  // Extract times from "booked from <day>, <date>, <time> to <day>, <date>, <time>"
  const timeFromBooked = text.match(
    /booked\s+from\s+.+?,\s+\d{1,2}:\d{2}\s*(AM|PM)\s+to\s+.+?,\s+(\d{1,2}:\d{2}\s*(?:AM|PM))/i
  );
  if (timeFromBooked) {
    // Extract both times from the full booked string
    const fullBooked = text.match(
      /booked\s+from\s+\w+day,\s+\w+\s+\d{1,2},\s+\d{4},?\s+(\d{1,2}:\d{2}\s*(?:AM|PM))\s+to\s+\w+day,\s+\w+\s+\d{1,2},\s+\d{4},?\s+(\d{1,2}:\d{2}\s*(?:AM|PM))/i
    );
    if (fullBooked) {
      pickupTime = to24Hour(fullBooked[1].trim());
      returnTime = to24Hour(fullBooked[2].trim());
      rawMatches.push(`Pickup time: "${pickupTime}"`, `Return time: "${returnTime}"`);
    }
  }

  // Also try "Trip start 4/9/26 8:00 am" / "Trip end 4/10/26 10:00 am"
  if (!pickupTime) {
    const tripStartTime = text.match(/trip\s+start\s+\S+\s+(\d{1,2}:\d{2}\s*(?:am|pm))/i);
    if (tripStartTime) {
      pickupTime = to24Hour(tripStartTime[1].trim());
      rawMatches.push(`Pickup time: "${pickupTime}"`);
    }
  }
  if (!returnTime) {
    const tripEndTime = text.match(/trip\s+end\s+\S+\s+(\d{1,2}:\d{2}\s*(?:am|pm))/i);
    if (tripEndTime) {
      returnTime = to24Hour(tripEndTime[1].trim());
      rawMatches.push(`Return time: "${returnTime}"`);
    }
  }

  // ── Extract location ──
  let location: string | null = null;

  // "... trip with your Volkswagen Jetta at Newark Liberty International Airport is booked from ..."
  const atPickupMatch = text.match(
    /trip\s+with\s+your\s+.+?\s+at\s+(.+?)\s+is\s+booked\s+from/i,
  );
  if (atPickupMatch) {
    location = atPickupMatch[1].trim();
    if (location) rawMatches.push(`Location (at pickup): "${location}"`);
    else location = null;
  }

  // "Delivery Newark, NJ Newark Liberty International Airport"
  const deliveryMatch = text.match(/delivery\s+(.+?)(?:\n|Guests|Special|To help|Review|Use the|$)/i);
  if (deliveryMatch) {
    // Clean up: strip trailing "method, and contact..." text
    location = deliveryMatch[1].trim()
      .replace(/\s*method,?\s+and\s+contact\s+.*/i, "")
      .replace(/\s*,?\s+and\s+contact\s+.*/i, "")
      .trim();
    if (location) rawMatches.push(`Location: "${location}"`);
    else location = null;
  }

  // Fallback: "Pickup location: ..." or "Location: ..."
  if (!location) {
    const locMatch = text.match(/(?:pickup\s+location|drop[\s-]?off\s+location|location)\s*[:–—-]\s*(.+?)(?:\n|$)/i);
    if (locMatch) {
      location = locMatch[1].trim();
      rawMatches.push(`Location: "${location}"`);
    }
  }

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

  // Pattern 1: "Trip starts: <date>" / "Trip begins: <date>" / "Trip ends: <date>"
  const tripStartMatch = text.match(/trip\s+start[s]?\s*[:–—-]\s*(.+?)(?:\n|$)/i)
    || text.match(/trip\s+begin[s]?\s*[:–—-]\s*(.+?)(?:\n|$)/i);
  const tripEndMatch = text.match(/trip\s+end[s]?\s*[:–—-]\s*(.+?)(?:\n|$)/i)
    || text.match(/trip\s+conclude[s]?\s*[:–—-]\s*(.+?)(?:\n|$)/i);
  if (tripStartMatch) {
    startDate = parseFlexibleDate(tripStartMatch[1]);
    rawMatches.push(`Trip start: "${tripStartMatch[1].trim()}"`);
  }
  if (tripEndMatch) {
    endDate = parseFlexibleDate(tripEndMatch[1]);
    rawMatches.push(`Trip end: "${tripEndMatch[1].trim()}"`);
  }

  // Pattern 1b: "Pickup on <date>" / "Return on <date>" (common in mobile-style Turo copy)
  if (!startDate) {
    const pickupOn = text.match(/pickup\s+on\s*[:–—-]?\s*(.+?)(?:\n|return|$)/i);
    if (pickupOn) {
      startDate = parseFlexibleDate(pickupOn[1]);
      if (startDate) rawMatches.push(`Pickup on: "${pickupOn[1].trim()}"`);
    }
  }
  if (!endDate) {
    const returnOn = text.match(/return\s+on\s*[:–—-]?\s*(.+?)(?:\n|pickup|guest|$)/i);
    if (returnOn) {
      endDate = parseFlexibleDate(returnOn[1]);
      if (endDate) rawMatches.push(`Return on: "${returnOn[1].trim()}"`);
    }
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

  // Pattern 4: Turo "booked from <date> to <date>" format
  // e.g. "is booked from Thursday, April 9, 2026, 8:00 AM to Friday, April 10, 2026, 10:00 AM"
  if (!startDate || !endDate) {
    const bookedFromTo = text.match(
      /booked\s+from\s+(.+?)\s+to\s+(.+?)(?:\.|You|$)/i
    );
    if (bookedFromTo) {
      const s = parseFlexibleDate(bookedFromTo[1]);
      const e = parseFlexibleDate(bookedFromTo[2]);
      if (s && !startDate) { startDate = s; rawMatches.push(`Booked from: "${bookedFromTo[1].trim()}"`); }
      if (e && !endDate) { endDate = e; rawMatches.push(`Booked to: "${bookedFromTo[2].trim()}"`); }
    }
  }

  // Pattern 4b: Turo "cancelled" emails — "Trip start: <date>" style but with "cancelled"
  // Also handle "from <date> to <date>" without "booked"
  if (!startDate || !endDate) {
    const fromToMatch = text.match(
      /from\s+(\w+day,\s+\w+\s+\d{1,2},\s+\d{4},?\s+\d{1,2}:\d{2}\s*(?:AM|PM)?)\s+to\s+(\w+day,\s+\w+\s+\d{1,2},\s+\d{4},?\s+\d{1,2}:\d{2}\s*(?:AM|PM)?)/i
    );
    if (fromToMatch) {
      const s = parseFlexibleDate(fromToMatch[1]);
      const e = parseFlexibleDate(fromToMatch[2]);
      if (s && !startDate) { startDate = s; rawMatches.push(`From: "${fromToMatch[1].trim()}"`); }
      if (e && !endDate) { endDate = e; rawMatches.push(`To: "${fromToMatch[2].trim()}"`); }
    }
  }

  // Pattern 5: Date range like "Apr 5 – Apr 8, 2026" or "04/05/2026 - 04/08/2026"
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
      /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\s*(?:[–—-]+|to)\s*(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/i
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
    // "Bob's trip is booked" / "Kati's trip with your..."
    /([A-Z][a-z]+(?:\s+[A-Z][a-z.]+)?)'s\s+trip/i,
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

  // Common make names for matching
  const makeNames = "Toyota|Honda|Nissan|BMW|Mercedes|Audi|Ford|Chevrolet|Chevy|Hyundai|Kia|Jeep|Tesla|Volkswagen|VW|Ram|RAM|Dodge|Subaru|Mazda|Lexus|Acura|Infiniti|Volvo|Porsche|Cadillac|Lincoln|Buick|GMC|Chrysler|Highland";

  // Look for year + make + model patterns
  const vehiclePatterns = [
    // "2018 Volkswagen Jetta" — year before make
    new RegExp(`(\\d{4})\\s+(${makeNames})[- ](\\w+(?:\\s+\\w+)?)`, "i"),
    // "Volkswagen Jetta 2018" — Turo "Booked trip" section puts year after model
    new RegExp(`(${makeNames})\\s+(\\w+(?:\\s+\\w+)?)\\s+(\\d{4})`, "i"),
    // "your Tesla Model 3" / "your Volkswagen Jetta" — Turo email subject/body
    new RegExp(`your\\s+(${makeNames})\\w*\\s+(\\w+(?:\\s+\\w+)?)`, "i"),
    /vehicle\s*[:–—-]\s*(.+?)(?:\n|$)/i,
    /car\s*[:–—-]\s*(.+?)(?:\n|$)/i,
  ];
  for (const pattern of vehiclePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[0].includes(":")) {
        vehicleDescription = match[1].trim();
      } else if (match[0].toLowerCase().startsWith("your")) {
        // "your Tesla Model 3" → "Tesla Model 3"
        vehicleDescription = `${match[1]} ${match[2] || ""}`.trim();
      } else if (/^\d{4}/.test(match[1])) {
        // Year before make: "2018 Volkswagen Jetta" → "2018 Volkswagen Jetta"
        vehicleDescription = `${match[1]} ${match[2]} ${match[3] || ""}`.trim();
      } else {
        // Make Model Year: "Volkswagen Jetta 2018" → "Volkswagen Jetta 2018"
        vehicleDescription = `${match[1]} ${match[2]} ${match[3] || ""}`.trim();
      }
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
    pickupTime,
    returnTime,
    location,
    earnings,
    isExtension,
    originalEndDate,
    confidence,
    rawMatches,
  };
}

/**
 * Convert "8:00 AM" / "10:00 PM" to 24-hour "HH:MM" format.
 */
function to24Hour(timeStr: string): string {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return timeStr;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${minutes}`;
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
    .replace(/[^\S\n]+/g, " ")
    .replace(/ \n/g, "\n")
    .trim();
}

/**
 * Parse a wide variety of date formats into YYYY-MM-DD.
 */
function parseFlexibleDate(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const s = dateStr.trim()
    .replace(/\s+at\s+.*/i, "")
    .replace(/,?\s+\d{1,2}:\d{2}\s*(AM|PM)?/i, "")
    .replace(/,\s*$/, "")
    .trim();

  // ISO format: 2026-04-05
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // US format: 04/05/2026 or 4/5/2026
  const usMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (usMatch) {
    let year = usMatch[3];
    if (year.length === 2) {
      year = (parseInt(year, 10) >= 70 ? "19" : "20") + year;
    }
    return `${year}-${usMatch[1].padStart(2, "0")}-${usMatch[2].padStart(2, "0")}`;
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
  const parsed = new Date(s + "T12:00:00");
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2020) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return null;
}
