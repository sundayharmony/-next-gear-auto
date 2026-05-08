const RECURRING_FLAG_KEY = "RECURRING_LONG_TERM";
const WEEKLY_DUE_DAY_KEY = "WEEKLY_DUE_DAY";
const META_LINE_REGEX = /^\[([A-Z_]+):(.*)\]$/;

export const WEEKLY_DUE_DAY_OPTIONS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type WeeklyDueDay = (typeof WEEKLY_DUE_DAY_OPTIONS)[number];

export interface RecurringBookingMeta {
  isRecurringLongTerm: boolean;
  weeklyDueDay?: WeeklyDueDay;
}

function normalizeWeeklyDueDay(value: string | undefined): WeeklyDueDay | undefined {
  if (!value) return undefined;
  const matched = WEEKLY_DUE_DAY_OPTIONS.find(
    (day) => day.toLowerCase() === value.trim().toLowerCase()
  );
  return matched;
}

export function parseRecurringBookingMeta(notes?: string | null): RecurringBookingMeta {
  if (!notes) return { isRecurringLongTerm: false };
  const lines = notes.split(/\r?\n/);
  const metadata = new Map<string, string>();

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(META_LINE_REGEX);
    if (!match) continue;
    metadata.set(match[1], match[2].trim());
  }

  const recurringRaw = metadata.get(RECURRING_FLAG_KEY);
  const isRecurringLongTerm = recurringRaw?.toLowerCase() === "true";
  const weeklyDueDay = normalizeWeeklyDueDay(metadata.get(WEEKLY_DUE_DAY_KEY));
  return { isRecurringLongTerm, weeklyDueDay };
}

export function stripRecurringBookingMeta(notes?: string | null): string {
  if (!notes) return "";
  const lines = notes.split(/\r?\n/);
  return lines
    .filter((line) => !line.trim().match(META_LINE_REGEX))
    .join("\n")
    .trim();
}

export function upsertRecurringBookingMeta(
  notes: string | null | undefined,
  meta: RecurringBookingMeta
): string {
  const lines = (notes || "").split(/\r?\n/);
  const nonMetaLines = lines.filter((line) => !line.trim().match(META_LINE_REGEX));
  const cleanedNotes = nonMetaLines.join("\n").trim();

  const metaLines: string[] = [];
  metaLines.push(`[${RECURRING_FLAG_KEY}:${meta.isRecurringLongTerm ? "true" : "false"}]`);
  if (meta.weeklyDueDay) {
    metaLines.push(`[${WEEKLY_DUE_DAY_KEY}:${meta.weeklyDueDay}]`);
  }

  if (!cleanedNotes) {
    return metaLines.join("\n");
  }
  return `${cleanedNotes}\n${metaLines.join("\n")}`;
}
