export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
  message?: string;
}

export interface ValidationRules {
  [field: string]: ValidationRule;
}

export function validate(value: string, rules: ValidationRule): string | null {
  const trimmedValue = value.trim();
  if (rules.required && (!trimmedValue || trimmedValue === "")) {
    return rules.message || "This field is required";
  }
  if (trimmedValue && rules.minLength && trimmedValue.length < rules.minLength) {
    return `Must be at least ${rules.minLength} characters`;
  }
  if (trimmedValue && rules.maxLength && trimmedValue.length > rules.maxLength) {
    return `Must be no more than ${rules.maxLength} characters`;
  }
  if (trimmedValue && rules.pattern && !rules.pattern.test(trimmedValue)) {
    return rules.message || "Invalid format";
  }
  if (trimmedValue && rules.custom) {
    return rules.custom(trimmedValue);
  }
  return null;
}

export const emailRule: ValidationRule = {
  required: true,
  custom: (value) => (isValidEmailFormat(value) ? null : "Please enter a valid email address"),
};

export const phoneRule: ValidationRule = {
  required: true,
  pattern: /^[+]?[\d\s().-]*\d{10,}[\d\s().-]*$/,
  message: "Please enter a valid phone number",
};

export const nameRule: ValidationRule = {
  required: true,
  minLength: 2,
  maxLength: 100,
  message: "Please enter your full name",
};

const HTML_DECODE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["&amp;", "&"],
  ["&lt;", "<"],
  ["&gt;", ">"],
  ["&quot;", '"'],
  ["&#39;", "'"],
  ["&#x27;", "'"],
];

const HTML_ESCAPE_MAP: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "`": "&#96;",
};

/** Decode common HTML entities from scraped meta tag content (no chained replace). */
export function decodeHtmlEntities(s: string): string {
  let out = s;
  for (const [entity, ch] of HTML_DECODE_PAIRS) {
    if (out.includes(entity)) {
      out = out.split(entity).join(ch);
    }
  }
  return out;
}

/** Escape HTML special characters to prevent XSS injection (no chained replace). */
export function escapeHtml(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    out += HTML_ESCAPE_MAP[ch] ?? ch;
  }
  return out;
}

/** Validate email without regex on user-controlled input (CodeQL ReDoS-safe). */
export function isValidEmailFormat(email: string): boolean {
  const s = email.trim();
  if (s.length < 3 || s.length > 254) return false;
  const at = s.indexOf("@");
  if (at < 1) return false;
  if (s.indexOf("@", at + 1) !== -1) return false;
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  if (!local || !domain) return false;
  const dot = domain.lastIndexOf(".");
  if (dot < 1 || dot >= domain.length - 1) return false;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    if (ch <= 32) return false;
  }
  return true;
}

/** Remove angle-bracket tags without regex on user input. */
export function stripHtmlAngleBrackets(s: string): string {
  let out = "";
  let inTag = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "<") {
      inTag = true;
      continue;
    }
    if (ch === ">") {
      inTag = false;
      continue;
    }
    if (!inTag) out += ch;
  }
  return out;
}

/** Parse currency display strings like "$1,234.56" without regex. */
export function parseDisplayPrice(value: string): number {
  let num = "";
  let sawDot = false;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch >= "0" && ch <= "9") {
      num += ch;
    } else if (ch === "." && !sawDot) {
      num += ch;
      sawDot = true;
    }
  }
  const n = parseFloat(num);
  return Number.isFinite(n) ? n : 0;
}

/** Collapse whitespace without regex on untrusted input. */
export function collapseWhitespace(s: string): string {
  let out = "";
  let lastWasSpace = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const isWs = ch === " " || ch === "\n" || ch === "\r" || ch === "\t";
    if (isWs) {
      if (!lastWasSpace) out += " ";
      lastWasSpace = true;
    } else {
      out += ch;
      lastWasSpace = false;
    }
  }
  let start = 0;
  let end = out.length;
  while (start < end && out[start] === " ") start++;
  while (end > start && out[end - 1] === " ") end--;
  return out.slice(start, end);
}

const BR_VARIANTS: ReadonlyArray<readonly [string, string]> = [
  ["<br/>", "\n"],
  ["<br />", "\n"],
  ["<br>", "\n"],
];

/** Strip HTML to plain text for email bodies / parsers (ReDoS-safe). */
export function stripRichHtmlToText(html: string): string {
  let s = html;
  for (const [from, to] of BR_VARIANTS) {
    if (s.includes(from)) s = s.split(from).join(to);
  }
  s = stripHtmlAngleBrackets(s);
  s = decodeHtmlEntities(s);
  return collapseWhitespace(s);
}

/** Only allow blob: URLs for locally created object URLs in img src. */
export function safeBlobImageSrc(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.startsWith("blob:") ? url : undefined;
}

const SAFE_DATA_IMAGE_PREFIXES = [
  "data:image/jpeg;base64,",
  "data:image/jpg;base64,",
  "data:image/png;base64,",
  "data:image/webp;base64,",
  "data:image/gif;base64,",
] as const;

/** Only allow data-URL image sources created locally (e.g. FileReader), not arbitrary strings. */
export function safeDataImageSrc(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  for (const prefix of SAFE_DATA_IMAGE_PREFIXES) {
    if (url.startsWith(prefix)) return url;
  }
  return undefined;
}

/** Escape HTML entities and strip CRLF (for SMTP header injection prevention) */
export function cleanInput(s: string): string {
  let trimmed = s.trim();
  let out = "";
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch !== "\r" && ch !== "\n") out += ch;
    else if (out.length > 0 && out[out.length - 1] !== " ") out += " ";
  }
  return escapeHtml(out);
}

/** Parse a date string safely, appending T00:00:00 if no time component present */
export function parseLocalDate(dateStr: string): Date {
  return new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00");
}

/** Get today's date as YYYY-MM-DD string */
export function todayDateString(): string {
  return new Date().toISOString().split("T")[0];
}
