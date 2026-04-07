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
  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  message: "Please enter a valid email address",
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

/** Escape HTML special characters to prevent XSS injection */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/`/g, "&#96;");
}

/** Escape HTML entities and strip CRLF (for SMTP header injection prevention) */
export function cleanInput(s: string): string {
  return escapeHtml(s.replace(/[\r\n]/g, " ").trim());
}

/** Parse a date string safely, appending T00:00:00 if no time component present */
export function parseLocalDate(dateStr: string): Date {
  return new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00");
}

/** Get today's date as YYYY-MM-DD string */
export function todayDateString(): string {
  return new Date().toISOString().split("T")[0];
}
