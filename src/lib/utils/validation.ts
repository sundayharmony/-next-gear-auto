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
  pattern: /^\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
  message: "Please enter a valid phone number",
};

export const nameRule: ValidationRule = {
  required: true,
  minLength: 2,
  maxLength: 100,
  message: "Please enter your full name",
};

export const dobRule: ValidationRule = {
  required: true,
  custom: (value: string) => {
    const dob = new Date(value);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate()) ? age - 1 : age;
    if (actualAge < 18) return "You must be at least 18 years old to rent a vehicle";
    if (actualAge > 120) return "Please enter a valid date of birth";
    return null;
  },
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
