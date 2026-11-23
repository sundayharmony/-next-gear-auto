/**
 * Reads the text stored in the PDF417 barcode on the back of a U.S./Canadian driver's license
 * (AAMVA standard), and a looser parser for text read from the front of a card by OCR.
 *
 * Everything here is plain TypeScript with no dependencies, so it runs in the browser and on the
 * server. Results are only ever suggestions; staff confirm them before anything is saved.
 */

export interface ParsedLicense {
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  /** YYYY-MM-DD */
  dob: string | null;
  licenseNumber: string | null;
  /** Two-letter state/province that issued the license. */
  licenseState: string | null;
  /** YYYY-MM-DD */
  expires: string | null;
  addressLine: string | null;
  city: string | null;
  /** Two-letter state/province of the address. */
  state: string | null;
  zip: string | null;
}

export const EMPTY_LICENSE: ParsedLicense = {
  firstName: null,
  middleName: null,
  lastName: null,
  dob: null,
  licenseNumber: null,
  licenseState: null,
  expires: null,
  addressLine: null,
  city: null,
  state: null,
  zip: null,
};

const clean = (v: string | undefined | null): string | null => {
  const t = (v ?? "").replace(/\s+/g, " ").trim();
  if (!t || /^(none|unavl|unavailable|n\/a)$/i.test(t)) return null;
  return t;
};

function isRealDate(y: number, m: number, d: number): boolean {
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * AAMVA dates are MMDDYYYY for U.S. licenses and YYYYMMDD for Canadian ones. A value is taken as
 * YYYYMMDD only when that reading is a valid date and the MMDDYYYY reading is not.
 */
export function parseAamvaDate(raw: string | null | undefined, country?: string | null): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const asUs = { m: +digits.slice(0, 2), d: +digits.slice(2, 4), y: +digits.slice(4) };
  const asIso = { y: +digits.slice(0, 4), m: +digits.slice(4, 6), d: +digits.slice(6) };
  const usOk = isRealDate(asUs.y, asUs.m, asUs.d);
  const isoOk = isRealDate(asIso.y, asIso.m, asIso.d);
  const preferIso = /^CAN?$/i.test(country ?? "");
  if (preferIso && isoOk) return `${asIso.y}-${pad(asIso.m)}-${pad(asIso.d)}`;
  if (usOk) return `${asUs.y}-${pad(asUs.m)}-${pad(asUs.d)}`;
  if (isoOk) return `${asIso.y}-${pad(asIso.m)}-${pad(asIso.d)}`;
  return null;
}

function formatZip(raw: string | null): string | null {
  const v = (raw ?? "").replace(/\s+/g, "").toUpperCase();
  if (!v) return null;
  if (/^\d{9}$/.test(v)) return `${v.slice(0, 5)}-${v.slice(5)}`; // ZIP+4
  if (/^\d{5}(-\d{4})?$/.test(v)) return v;
  if (/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(v)) return `${v.slice(0, 3)} ${v.slice(3)}`; // Canadian
  return v;
}

function titleCase(v: string | null): string | null {
  if (!v) return null;
  return v.toLowerCase().replace(/(^|[\s'-])([a-z])/g, (_, a, b) => a + b.toUpperCase());
}

/** True when the text looks like an AAMVA barcode payload. */
export function looksLikeAamva(text: string): boolean {
  return /ANSI\s*\d{6}/.test(text) || (/\bDAQ/.test(text) && /\bDBB/.test(text));
}

/**
 * Parses raw barcode text. Fields are three-letter element ids (DAQ, DBB...) each followed by its
 * value and ended by a line break, so the text is split on line breaks and each line is matched on
 * its first three characters.
 */
export function parseAamvaBarcode(text: string): ParsedLicense | null {
  if (!text || !looksLikeAamva(text)) return null;

  const fields = new Map<string, string>();
  const lines = text.split(/[\r\n\u001e]+/);
  for (const rawLine of lines) {
    // The header line ("ANSI 636036090002DL00410278ZN03290015DL") runs straight into the first
    // element ("DLDCSHOPSON"), so strip the header before reading the element.
    // [\s\S] is the ES2017 stand-in for the dotAll (/s) flag, which this tsconfig target rejects.
    const line = rawLine.replace(/^[\s\S]*?ANSI\s*\d{12}(?:[A-Z]{2}\d{8})+(?:DL|ID)?/, "").trim();
    const m = /^(D[A-Z]{2})(.*)$/.exec(line);
    if (m && !fields.has(m[1])) fields.set(m[1], m[2]);
  }

  const get = (k: string) => clean(fields.get(k));
  const country = get("DCG");

  let first = get("DAC");
  let middle = get("DAD");
  let last = get("DCS");
  if (!first && !last) {
    const full = get("DAA"); // older format: LAST,FIRST,MIDDLE
    if (full) {
      const parts = full.split(/[,$]/).map((p) => p.trim());
      last = parts[0] || null;
      first = parts[1] || null;
      middle = parts[2] || null;
    }
  }

  const result: ParsedLicense = {
    firstName: titleCase(first),
    middleName: titleCase(middle),
    lastName: titleCase(last),
    dob: parseAamvaDate(get("DBB"), country),
    licenseNumber: get("DAQ")?.replace(/\s+/g, " ") ?? null,
    licenseState: get("DAJ")?.toUpperCase().slice(0, 2) ?? null,
    expires: parseAamvaDate(get("DBA"), country),
    addressLine: titleCase(get("DAG")),
    city: titleCase(get("DAI")),
    state: get("DAJ")?.toUpperCase().slice(0, 2) ?? null,
    zip: formatZip(get("DAK")),
  };

  const found = [result.dob, result.licenseNumber, result.lastName].filter(Boolean).length;
  return found >= 2 ? result : null;
}

const US_STATES = new Set(
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" "),
);

/**
 * Best-effort parse of text read from the FRONT of a license by OCR. OCR is imperfect, so every
 * value is only a suggestion for staff to check against the photo.
 */
export function parseLicenseFrontText(text: string): ParsedLicense | null {
  if (!text) return null;
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const joined = lines.join("\n");
  const result: ParsedLicense = { ...EMPTY_LICENSE };

  const dates = [...joined.matchAll(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/g)]
    .map((m) => ({ m: +m[1], d: +m[2], y: +m[3], idx: m.index ?? 0 }))
    .filter((x) => isRealDate(x.y, x.m, x.d));
  const iso = (x: { y: number; m: number; d: number }) => `${x.y}-${pad(x.m)}-${pad(x.d)}`;

  const nearLabel = (labels: RegExp) => {
    for (const x of dates) {
      const before = joined.slice(Math.max(0, x.idx - 18), x.idx);
      if (labels.test(before)) return x;
    }
    return null;
  };
  const dobDate = nearLabel(/DOB|BIRTH|DBB/i);
  const expDate = nearLabel(/EXP|EXPIRES|DBA|4B/i);
  if (dobDate) result.dob = iso(dobDate);
  if (expDate) result.expires = iso(expDate);
  if (!result.dob && dates.length) {
    // Without labels, the earliest date is almost always the birth date.
    result.dob = iso([...dates].sort((a, b) => a.y - b.y || a.m - b.m || a.d - b.d)[0]);
  }
  if (!result.expires && dates.length > 1) {
    result.expires = iso([...dates].sort((a, b) => b.y - a.y || b.m - a.m || b.d - a.d)[0]);
  }

  // License number: NJ is one letter + 14 digits; most states are 6-15 letters/digits.
  const num =
    /\b(?:DL|LIC(?:ENSE)?|LICENSE NO|DLN|4D)[ #:.NO]*([A-Z]\d{4}[ -]?\d{5}[ -]?\d{5}|[A-Z0-9][A-Z0-9 -]{5,18}[A-Z0-9])\b/i.exec(
      joined,
    ) || /\b([A-Z]\d{4}[ -]?\d{5}[ -]?\d{5})\b/.exec(joined);
  if (num) result.licenseNumber = num[1].replace(/\s+/g, " ").trim().toUpperCase();

  // Address: street line begins with digits; the next line holds "CITY, ST 12345".
  for (let i = 0; i < lines.length; i++) {
    const cityLine = /^(.{2,40}?),?\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\b/.exec(lines[i]);
    if (cityLine && US_STATES.has(cityLine[2])) {
      result.city = titleCase(cityLine[1].replace(/,$/, "").trim());
      result.state = cityLine[2];
      result.licenseState = cityLine[2];
      result.zip = cityLine[3];
      const street = i > 0 ? lines[i - 1] : "";
      if (/^\d/.test(street)) result.addressLine = titleCase(street.replace(/^(?:ADDRESS|ADD|8)[: ]+/i, ""));
      break;
    }
  }

  const filled = [result.dob, result.licenseNumber, result.addressLine].filter(Boolean).length;
  return filled >= 1 ? result : null;
}

/** Shape stored on the customer: customers.driver_license JSON. */
export function toDriverLicenseJson(p: ParsedLicense) {
  return {
    number: p.licenseNumber,
    state: p.licenseState,
    expires: p.expires,
    address: { line1: p.addressLine, city: p.city, state: p.state, zip: p.zip },
  };
}
