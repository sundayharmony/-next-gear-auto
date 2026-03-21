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

  // Sanitize — never log sensitive fields
  if (entry.details) {
    const sensitiveKeys = ["password", "password_hash", "token", "secret", "card", "ssn"];
    for (const key of sensitiveKeys) {
      if (key in entry.details) {
        entry.details[key] = "[REDACTED]";
      }
    }
  }

  // Output as structured JSON for Vercel log ingestion
  console.log(`[SECURITY_AUDIT] ${JSON.stringify(entry)}`);
}
