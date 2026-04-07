/**
 * Password policy enforcement.
 * Minimum 12 characters, at least one uppercase, one lowercase, one digit, one special character.
 */

export interface PasswordValidationResult {
  valid: boolean;
  message: string;
}

const MIN_LENGTH = 12;

export function validatePassword(password: string): PasswordValidationResult {
  if (!password || password.length < MIN_LENGTH) {
    return {
      valid: false,
      message: `Password must be at least ${MIN_LENGTH} characters long.`,
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one uppercase letter.",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one lowercase letter.",
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one number.",
    };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one special character.",
    };
  }

  return { valid: true, message: "" };
}

/** Human-readable password requirements for error messages */
export const PASSWORD_REQUIREMENTS =
  "Password must be at least 12 characters with uppercase, lowercase, number, and special character.";
