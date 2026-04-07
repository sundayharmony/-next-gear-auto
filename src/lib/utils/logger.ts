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

function serializeContext(context: unknown): string {
  if (context === null || context === undefined) {
    return "";
  }
  if (context instanceof Error) {
    return `${context.name}: ${context.message}${context.stack ? "\n" + context.stack : ""}`;
  }
  if (typeof context === "string") {
    return context;
  }
  try {
    return JSON.stringify(context);
  } catch (e) {
    // Handle circular references and other serialization errors
    if (e instanceof TypeError && e.message.includes("circular")) {
      return "[Circular]";
    }
    return String(context);
  }
}

function log(entry: LogEntry): void {
  const prefix = `[${entry.level.toUpperCase()}] ${entry.timestamp}`;
  const contextStr = serializeContext(entry.context);
  switch (entry.level) {
    case "debug":
      if (isDev) console.debug(prefix, entry.message, contextStr);
      break;
    case "info":
      console.info(prefix, entry.message, contextStr);
      break;
    case "warn":
      console.warn(prefix, entry.message, contextStr);
      break;
    case "error":
      console.error(prefix, entry.message, contextStr);
      break;
  }
}

export const logger = {
  debug: (message: string, context?: unknown) => log(createLogEntry("debug", message, context)),
  info: (message: string, context?: unknown) => log(createLogEntry("info", message, context)),
  warn: (message: string, context?: unknown) => log(createLogEntry("warn", message, context)),
  error: (message: string, context?: unknown) => log(createLogEntry("error", message, context)),
};
