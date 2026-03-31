/**
 * Security audit logging.
 *
 * Logs security-relevant events in structured JSON format.
 * In production these appear in Vercel runtime logs and can be queried.
 *
 * Usage:
 *   auditLog("LOGIN_FAILED", { email, ip, reason: "Invalid password" });
 *   auditLog("ADMIN_ACTION", { adminId, action: "delete_booking", targetId: bookingId });
 */

export type AuditEventType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "SIGNUP"
  | "LOGOUT"
  | "PASSWORD_SET"
  | "PASSWORD_CHANGE"
  | "ADMIN_ACTION"
  | "AUTH_FAILURE"
  | "RATE_LIMITED"
  | "CSRF_REJECTED"
  | "SUSPICIOUS_ACTIVITY";

interface AuditLogEntry {
  event: AuditEventType;
  timestamp: string;
  ip?: string;
  userId?: string;
  email?: string;
  details?: Record<string, unknown>;
}

/**
 * Recursively redact sensitive keys in objects.
 */
function redactSensitiveData(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ["password", "password_hash", "token", "secret", "card", "ssn"];

  for (const key in obj) {
    if (sensitiveKeys.includes(key)) {
      obj[key] = "[REDACTED]";
    } else if (obj[key] !== null && typeof obj[key] === "object") {
      // Recursively redact nested objects and arrays
      if (Array.isArray(obj[key])) {
        (obj[key] as unknown[]).forEach((item) => {
          if (item !== null && typeof item === "object") {
            redactSensitiveData(item as Record<string, unknown>);
          }
        });
      } else {
        redactSensitiveData(obj[key] as Record<string, unknown>);
      }
    }
  }

  return obj;
}

/**
 * Write a structured security audit log entry.
 * These are output as JSON to stdout (captured by Vercel runtime logs).
 * Never logs passwords, tokens, or full credit card numbers.
 */
export function auditLog(
  event: AuditEventType,
  data: Omit<AuditLogEntry, "event" | "timestamp"> = {}
) {
  const entry: AuditLogEntry = {
    event,
    timestamp: new Date().toISOString(),
    ...data,
  };

  // Sanitize — recursively redact sensitive fields including nested objects
  if (entry.details) {
    redactSensitiveData(entry.details);
  }

  // Output as structured JSON for Vercel log ingestion
  console.log(`[SECURITY_AUDIT] ${JSON.stringify(entry)}`);
}
