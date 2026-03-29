type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: unknown;
}

/**
 * SECURITY WARNING: Never pass sensitive data to logger functions.
 * Avoid logging: passwords, API tokens, JWT tokens, email addresses,
 * credit card numbers, SSNs, or other PII. Do not log entire request
 * bodies that may contain sensitive information. When logging errors,
 * sanitize the error message to exclude credentials or personal data.
 */

const isDev = process.env.NODE_ENV === "development";

function createLogEntry(level: LogLevel, message: string, context?: unknown): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };
}

function log(entry: LogEntry): void {
  if (isDev) {
    const prefix = `[${entry.level.toUpperCase()}] ${entry.timestamp}`;
    switch (entry.level) {
      case "debug":
        console.debug(prefix, entry.message, entry.context || "");
        break;
      case "info":
        console.info(prefix, entry.message, entry.context || "");
        break;
      case "warn":
        console.warn(prefix, entry.message, entry.context || "");
        break;
      case "error":
        console.error(prefix, entry.message, entry.context || "");
        break;
    }
  }
  // In production, send to external service (Sentry, LogRocket, etc.)
}

export const logger = {
  debug: (message: string, context?: unknown) => log(createLogEntry("debug", message, context)),
  info: (message: string, context?: unknown) => log(createLogEntry("info", message, context)),
  warn: (message: string, context?: unknown) => log(createLogEntry("warn", message, context)),
  error: (message: string, context?: unknown) => log(createLogEntry("error", message, context)),
};
