/**
 * Weekly owner settlement (Monday–Sunday).
 *
 * Formula per vehicle / week:
 *   grossWeek     = booking + Turo revenue overlapping the week (day-prorated)
 *   insuranceWeek = monthly_insurance prorated across calendar days in the week
 *   net           = max(0, grossWeek − insuranceWeek)
 *   platformFee   = net × 25%
 *   ownerPayout   = net − platformFee (75%)
 */

import { rentalDays } from "@/lib/owner/finance";
import {
  addCalendarDaysYyyyMmDd,
  formatYyyyMmDdLocal,
  getBusinessTodayYyyyMmDd,
  isYyyyMmDd,
  localMidnightFromYyyyMmDd,
} from "@/lib/utils/booking-dates";

export const PLATFORM_FEE_RATE = 0.25;
export const OWNER_SHARE_RATE = 0.75;

function round2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

/** Monday (inclusive) → Sunday (inclusive) for the week containing `anchorYyyyMmDd`. */
export function getWeekRange(anchorYyyyMmDd?: string): {
  weekStart: string;
  weekEnd: string;
} {
  const anchor =
    anchorYyyyMmDd && isYyyyMmDd(anchorYyyyMmDd)
      ? anchorYyyyMmDd
      : getBusinessTodayYyyyMmDd();
  const d = localMidnightFromYyyyMmDd(anchor);
  // JS: 0=Sun … 1=Mon … 6=Sat → days since Monday
  const day = d.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - daysFromMonday);
  const weekStart = formatYyyyMmDdLocal(d);
  const weekEnd = addCalendarDaysYyyyMmDd(weekStart, 6);
  return { weekStart, weekEnd };
}

/** Normalize any date in a week to that week's Monday. */
export function normalizeWeekStart(weekStartOrAny?: string): string {
  return getWeekRange(weekStartOrAny).weekStart;
}

/**
 * Prorate monthly insurance across the calendar days of `[weekStart, weekEnd]`.
 * Days in different months use that month's length (handles spanning months).
 */
export function prorateMonthlyInsurance(
  monthlyInsurance: number,
  weekStart: string,
  weekEnd: string,
): number {
  const monthly = Math.max(0, Number(monthlyInsurance) || 0);
  if (monthly <= 0) return 0;
  if (!isYyyyMmDd(weekStart) || !isYyyyMmDd(weekEnd) || weekEnd < weekStart) return 0;

  let total = 0;
  let cursor = weekStart;
  while (cursor <= weekEnd) {
    const [y, m] = cursor.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    total += monthly / daysInMonth;
    cursor = addCalendarDaysYyyyMmDd(cursor, 1);
  }
  return round2(total);
}

/** Inclusive overlap day count between two YYYY-MM-DD ranges. */
export function overlappingDays(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): number {
  if (!isYyyyMmDd(aStart) || !isYyyyMmDd(aEnd) || !isYyyyMmDd(bStart) || !isYyyyMmDd(bEnd)) {
    return 0;
  }
  const start = aStart > bStart ? aStart : bStart;
  const end = aEnd < bEnd ? aEnd : bEnd;
  if (end < start) return 0;
  return rentalDays(start, end);
}

/** Attribute booking/Turo gross to the week by overlapping rental days. */
export function attributeRevenueToWeek(
  grossRevenue: number,
  pickupDate: string,
  returnDate: string,
  weekStart: string,
  weekEnd: string,
): number {
  const gross = Math.max(0, Number(grossRevenue) || 0);
  if (gross <= 0) return 0;
  const totalDays = rentalDays(pickupDate, returnDate);
  const overlap = overlappingDays(pickupDate, returnDate, weekStart, weekEnd);
  if (overlap <= 0) return 0;
  return round2((gross * overlap) / totalDays);
}

export interface WeekTripLine {
  id: string;
  kind: "booking" | "turo";
  vehicleId: string;
  vehicleName: string;
  customerName: string;
  pickupDate: string;
  returnDate: string;
  grossTotal: number;
  attributedGross: number;
  overlapDays: number;
  rentalDays: number;
}

export interface VehicleWeekSettlement {
  vehicleId: string;
  vehicleName: string;
  ownerId: string;
  monthlyInsurance: number;
  grossWeek: number;
  insuranceWeek: number;
  net: number;
  platformFee: number;
  ownerPayout: number;
  trips: WeekTripLine[];
}

export interface OwnerWeekSettlement {
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  grossWeek: number;
  insuranceWeek: number;
  net: number;
  platformFee: number;
  ownerPayout: number;
  vehicles: VehicleWeekSettlement[];
}

export function computeVehicleWeekSettlement(input: {
  vehicleId: string;
  vehicleName: string;
  ownerId: string;
  monthlyInsurance: number;
  weekStart: string;
  weekEnd: string;
  trips: Array<{
    id: string;
    kind: "booking" | "turo";
    customerName: string;
    pickupDate: string;
    returnDate: string;
    grossTotal: number;
  }>;
}): VehicleWeekSettlement {
  const trips: WeekTripLine[] = [];
  let grossWeek = 0;

  for (const trip of input.trips) {
    const totalDays = rentalDays(trip.pickupDate, trip.returnDate);
    const overlap = overlappingDays(
      trip.pickupDate,
      trip.returnDate,
      input.weekStart,
      input.weekEnd,
    );
    const attributedGross = attributeRevenueToWeek(
      trip.grossTotal,
      trip.pickupDate,
      trip.returnDate,
      input.weekStart,
      input.weekEnd,
    );
    if (attributedGross <= 0 && overlap <= 0) continue;
    grossWeek = round2(grossWeek + attributedGross);
    trips.push({
      id: trip.id,
      kind: trip.kind,
      vehicleId: input.vehicleId,
      vehicleName: input.vehicleName,
      customerName: trip.customerName,
      pickupDate: trip.pickupDate,
      returnDate: trip.returnDate,
      grossTotal: round2(Math.max(0, trip.grossTotal)),
      attributedGross,
      overlapDays: overlap,
      rentalDays: totalDays,
    });
  }

  const insuranceWeek = prorateMonthlyInsurance(
    input.monthlyInsurance,
    input.weekStart,
    input.weekEnd,
  );
  const net = round2(Math.max(0, grossWeek - insuranceWeek));
  const platformFee = round2(net * PLATFORM_FEE_RATE);
  const ownerPayout = round2(net - platformFee);

  return {
    vehicleId: input.vehicleId,
    vehicleName: input.vehicleName,
    ownerId: input.ownerId,
    monthlyInsurance: round2(Math.max(0, input.monthlyInsurance)),
    grossWeek,
    insuranceWeek,
    net,
    platformFee,
    ownerPayout,
    trips,
  };
}

export function computeOwnerWeekSettlement(input: {
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  vehicles: VehicleWeekSettlement[];
}): OwnerWeekSettlement {
  let grossWeek = 0;
  let insuranceWeek = 0;
  let net = 0;
  let platformFee = 0;
  let ownerPayout = 0;
  for (const v of input.vehicles) {
    grossWeek = round2(grossWeek + v.grossWeek);
    insuranceWeek = round2(insuranceWeek + v.insuranceWeek);
    net = round2(net + v.net);
    platformFee = round2(platformFee + v.platformFee);
    ownerPayout = round2(ownerPayout + v.ownerPayout);
  }
  return {
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    ownerEmail: input.ownerEmail,
    grossWeek,
    insuranceWeek,
    net,
    platformFee,
    ownerPayout,
    vehicles: input.vehicles,
  };
}

export function sumOwnerWeekSettlements(owners: OwnerWeekSettlement[]): {
  grossWeek: number;
  insuranceWeek: number;
  net: number;
  platformFee: number;
  ownerPayout: number;
} {
  let grossWeek = 0;
  let insuranceWeek = 0;
  let net = 0;
  let platformFee = 0;
  let ownerPayout = 0;
  for (const o of owners) {
    grossWeek = round2(grossWeek + o.grossWeek);
    insuranceWeek = round2(insuranceWeek + o.insuranceWeek);
    net = round2(net + o.net);
    platformFee = round2(platformFee + o.platformFee);
    ownerPayout = round2(ownerPayout + o.ownerPayout);
  }
  return { grossWeek, insuranceWeek, net, platformFee, ownerPayout };
}
