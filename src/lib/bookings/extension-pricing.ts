/** Suggested extension charge for N calendar days at the vehicle daily rate. */
export function suggestDailyExtensionAmount(days: number, dailyRate: number): number {
  const safeDays = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 0;
  const safeRate = Number.isFinite(dailyRate) ? Math.max(0, dailyRate) : 0;
  return Math.round(safeDays * safeRate * 100) / 100;
}
