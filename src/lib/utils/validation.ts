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
  if (rules.required && (!value || value.trim() === "")) {
    return rules.message || "This field is required";
  }
  if (value && rules.minLength && value.length < rules.minLength) {
    return `Must be at least ${rules.minLength} characters`;
  }
  if (value && rules.maxLength && value.length > rules.maxLength) {
    return `Must be no more than ${rules.maxLength} characters`;
  }
  if (value && rules.pattern && !rules.pattern.test(value)) {
    return rules.message || "Invalid format";
  }
  if (value && rules.custom) {
    return rules.custom(value);
  }
  return null;
}

export const emailRule: ValidationRule = {
  required: true,
  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  message: "Please enter a valid email address",
};

export const phoneRule: ValidationRule = {
  required: true,
  pattern: /^[+]?[\d\s().-]{7,20}$/,
  message: "Please enter a valid phone number",
};

export const nameRule: ValidationRule = {
  required: true,
  minLength: 2,
  maxLength: 100,
  message: "Please enter your full name",
};

export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}
