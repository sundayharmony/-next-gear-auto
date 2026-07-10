"use client";

import { useMemo } from "react";
import { calculateFinancing } from "@/lib/utils/financing";
import { getLocalYmd } from "@/lib/utils/date-helpers";
import {
  countInclusiveTripDays,
  resolveTuroTripRevenue,
  addProratedTuroRevenueByDay,
  forEachProratedTuroDay,
} from "@/lib/utils/turo-blocked-date";
import { isActiveCalendarBlock, isTuroBlockedSource } from "@/lib/utils/blocked-dates";
import {
  addProratedBookingRevenueByDay,
  countBookedDaysInRange,
  forEachProratedBookingDayInRange,
  prorateBookingRevenueInRange,
  prorateTripRevenueInRange,
} from "@/lib/finance/booking-proration";
import { getVehicleDisplayName } from "@/lib/types";
import type { UnifiedExpense, Vehicle } from "./finances-shared";
import type {
  BlockedDateFinanceEntry,
  FinanceBooking,
  FinanceExpense,
  FinanceMaintenanceRecord,
  FinanceTicketRow,
} from "./use-finances-data";

function buildMonthRange(fromDate: string, toDate: string) {
  const months: Record<string, string> = {};
  const startD = new Date(fromDate + "T12:00:00");
  const endD = new Date(toDate + "T12:00:00");
  const cursor = new Date(startD.getFullYear(), startD.getMonth(), 1);
  while (cursor <= endD) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    months[key] = cursor.toLocaleDateString("en-US", { month: "short" });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

export interface FinancesComputedInput {
  bookings: FinanceBooking[];
  blockedDates: BlockedDateFinanceEntry[];
  expenses: FinanceExpense[];
  vehicles: Vehicle[];
  maintenance: FinanceMaintenanceRecord[];
  tickets: FinanceTicketRow[];
  dateRange: { from: string; to: string };
}

function isActiveTuroFinanceBlock(block: BlockedDateFinanceEntry): boolean {
  return isTuroBlockedSource(block.source) && isActiveCalendarBlock(block);
}

export function useFinancesComputed({
  bookings,
  blockedDates,
  expenses,
  vehicles,
  maintenance,
  tickets,
  dateRange,
}: FinancesComputedInput) {
  const filteredBookings = useMemo(
    () =>
      bookings.filter((b) => b.pickup_date <= dateRange.to && b.return_date >= dateRange.from),
    [bookings, dateRange]
  );

  const revenueBookings = useMemo(
    () => filteredBookings.filter((b) => ["confirmed", "active", "completed"].includes(b.status)),
    [filteredBookings]
  );

  const turoRevenueEntries = useMemo(() => {
    return blockedDates
      .filter(isActiveTuroFinanceBlock)
      .filter((block) => block.start_date <= dateRange.to && block.end_date >= dateRange.from)
      .map((block) => {
        const fullRevenue = resolveTuroTripRevenue(block);
        const revenue = prorateTripRevenueInRange(
          block.start_date,
          block.end_date,
          fullRevenue,
          dateRange.from,
          dateRange.to
        );
        return {
          id: block.id,
          vehicle_id: block.vehicle_id,
          revenue,
          fullRevenue,
          date: block.start_date,
          start_date: block.start_date,
          end_date: block.end_date,
          reason: block.reason ?? null,
        };
      });
  }, [blockedDates, dateRange]);

  const tripExpenseTotalsByBlockedId = useMemo(() => {
    const m = new Map<string, number>();
    expenses.forEach((e) => {
      if (e.blocked_date_id) {
        m.set(e.blocked_date_id, (m.get(e.blocked_date_id) || 0) + (e.amount ?? 0));
      }
    });
    return m;
  }, [expenses]);

  const maintenanceCosts = useMemo((): UnifiedExpense[] => {
    return maintenance
      .filter((m) => m.status === "completed")
      .map((m) => ({
        id: m.id,
        vehicle_id: m.vehicleId,
        category: "maintenance" as const,
        amount: m.cost ?? 0,
        description: m.title,
        date: m.completedDate || m.scheduledDate || m.createdAt,
        created_at: m.createdAt,
        source: "maintenance" as const,
      }))
      .filter((m) => m.date >= dateRange.from && m.date <= dateRange.to);
  }, [maintenance, dateRange]);

  const financingCosts = useMemo((): UnifiedExpense[] => {
    const entries: UnifiedExpense[] = [];

    vehicles.forEach((vehicle) => {
      if (!vehicle.isFinanced || !vehicle.monthlyPayment || !vehicle.financingStartDate) return;

      const financing = calculateFinancing(vehicle);
      if (!financing || financing.paymentsProcessed === 0) return;

      const startDate = new Date(vehicle.financingStartDate);
      if (isNaN(startDate.getTime())) return;

      const paymentDay = Math.min(Math.max(vehicle.paymentDayOfMonth || 1, 1), 31);

      for (let i = 0; i < financing.paymentsProcessed; i++) {
        try {
          const payMonth = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
          const daysInMonth = new Date(payMonth.getFullYear(), payMonth.getMonth() + 1, 0).getDate();
          const actualDay = Math.min(paymentDay, daysInMonth);
          const actualDate = new Date(payMonth.getFullYear(), payMonth.getMonth(), actualDay);
          if (isNaN(actualDate.getTime())) continue;
          const dateStr = getLocalYmd(actualDate);

          if (dateStr >= dateRange.from && dateStr <= dateRange.to) {
            entries.push({
              id: `financing-${vehicle.id}-${i}`,
              vehicle_id: vehicle.id,
              category: "financing",
              amount: financing.monthlyPayment,
              description: `Monthly payment — ${getVehicleDisplayName(vehicle)}`,
              date: dateStr,
              created_at: dateStr,
              source: "financing" as const,
            });
          }
        } catch {
          continue;
        }
      }
    });

    return entries;
  }, [vehicles, dateRange]);

  const ticketCosts = useMemo((): UnifiedExpense[] => {
    return tickets
      .map((ticket) => ({
        id: ticket.id,
        vehicle_id: ticket.vehicle_id ?? null,
        category: "tickets" as const,
        amount: ticket.amount_due ?? 0,
        description: `${ticket.ticket_type || "Ticket"} — ${ticket.municipality || "Unknown"}, ${ticket.state || ""}`,
        date: ticket.violation_date || ticket.created_at || getLocalYmd(new Date()),
        created_at: ticket.created_at || new Date().toISOString(),
        source: "ticket" as const,
      }))
      .filter((t) => t.date >= dateRange.from && t.date <= dateRange.to);
  }, [tickets, dateRange]);

  const filteredExpenses = useMemo(
    (): UnifiedExpense[] =>
      expenses
        .filter((e) => e.date >= dateRange.from && e.date <= dateRange.to)
        .map((e) => ({
          ...e,
          description: e.description ?? null,
          source: "manual" as const,
          blocked_date_id: e.blocked_date_id ?? null,
        })),
    [expenses, dateRange]
  );

  const allExpenses = useMemo((): UnifiedExpense[] => {
    return [...filteredExpenses, ...maintenanceCosts, ...financingCosts, ...ticketCosts];
  }, [filteredExpenses, maintenanceCosts, financingCosts, ticketCosts]);

  const summaryData = useMemo(() => {
    const bookingRevenue = revenueBookings.reduce(
      (sum, b) =>
        sum +
        prorateBookingRevenueInRange(
          b.total_price ?? 0,
          b.pickup_date,
          b.return_date,
          dateRange.from,
          dateRange.to
        ),
      0
    );
    const turoRevenue = turoRevenueEntries.reduce((sum, entry) => sum + entry.revenue, 0);
    const totalRevenue = bookingRevenue + turoRevenue;
    const totalExpenses = allExpenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const totalDaysInRange = Math.max(1, countInclusiveTripDays(dateRange.from, dateRange.to));

    let totalBookedDays = 0;
    revenueBookings.forEach((booking) => {
      totalBookedDays += countBookedDaysInRange(
        booking.pickup_date,
        booking.return_date,
        dateRange.from,
        dateRange.to
      );
    });

    const occupancyRate =
      vehicles.length > 0
        ? Math.min(100, Math.max(0, (totalBookedDays / (totalDaysInRange * vehicles.length)) * 100))
        : 0;

    const avgBookingValue =
      revenueBookings.length > 0 ? bookingRevenue / revenueBookings.length : 0;

    return {
      bookingRevenue,
      turoRevenue,
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      occupancyRate,
      totalBookings: revenueBookings.length,
      avgBookingValue,
      totalBookedDays,
    };
  }, [revenueBookings, turoRevenueEntries, allExpenses, vehicles, dateRange]);

  const cashFlowData = useMemo(() => {
    const monthLabels = buildMonthRange(dateRange.from, dateRange.to);
    const months: Record<string, { month: string; income: number; expenses: number }> = {};

    Object.entries(monthLabels).forEach(([key, label]) => {
      months[key] = { month: label, income: 0, expenses: 0 };
    });

    revenueBookings.forEach((b) => {
      forEachProratedBookingDayInRange(
        b.pickup_date,
        b.return_date,
        b.total_price ?? 0,
        dateRange.from,
        dateRange.to,
        (_dayStr, monthKey, amt) => {
          if (months[monthKey]) months[monthKey].income += amt;
        }
      );
    });
    blockedDates
      .filter(
        (b) =>
          isActiveTuroFinanceBlock(b) &&
          b.start_date <= dateRange.to &&
          b.end_date >= dateRange.from
      )
      .forEach((block) => {
        const R = resolveTuroTripRevenue(block);
        forEachProratedTuroDay(block, R, (_dayStr, monthKey, amt) => {
          if (months[monthKey]) months[monthKey].income += amt;
        });
      });

    allExpenses.forEach((e) => {
      const key = e.date.substring(0, 7);
      if (months[key]) months[key].expenses += e.amount ?? 0;
    });

    return Object.values(months).map((m) => ({
      ...m,
      income: Math.round(m.income),
      expenses: Math.round(m.expenses),
      net: Math.round(m.income - m.expenses),
    }));
  }, [revenueBookings, blockedDates, allExpenses, dateRange]);

  const dailyEarningsData = useMemo(() => {
    const startD = new Date(dateRange.from + "T12:00:00");
    const endD = new Date(dateRange.to + "T12:00:00");
    const rangeDays = Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const showDays = Math.min(rangeDays, 30);
    const days: { label: string; date: string; revenue: number; expenses: number }[] = [];

    for (let i = showDays - 1; i >= 0; i--) {
      const d = new Date(endD);
      d.setDate(d.getDate() - i);
      days.push({
        date: getLocalYmd(d),
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        revenue: 0,
        expenses: 0,
      });
    }

    const dayMap = new Map<string, number>();
    days.forEach((d, idx) => dayMap.set(d.date, idx));

    revenueBookings.forEach((b) => {
      addProratedBookingRevenueByDay(
        b.pickup_date,
        b.return_date,
        b.total_price ?? 0,
        dateRange.from,
        dateRange.to,
        dayMap,
        days
      );
    });
    blockedDates
      .filter(
        (b) =>
          isActiveTuroFinanceBlock(b) &&
          b.start_date <= dateRange.to &&
          b.end_date >= dateRange.from
      )
      .forEach((block) => {
        const R = resolveTuroTripRevenue(block);
        addProratedTuroRevenueByDay(block, R, dayMap, days);
      });

    allExpenses.forEach((e) => {
      const idx = dayMap.get(e.date);
      if (idx !== undefined) days[idx].expenses += e.amount ?? 0;
    });

    return days.map((d) => ({
      ...d,
      revenue: Math.round(d.revenue),
      expenses: Math.round(d.expenses),
    }));
  }, [revenueBookings, blockedDates, allExpenses, dateRange]);

  const expenseCategoryData = useMemo(() => {
    const totals: Record<string, number> = {};
    allExpenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + (e.amount ?? 0);
    });
    return Object.entries(totals)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        key: name,
        value: Math.round(value),
      }))
      .sort((a, b) => b.value - a.value);
  }, [allExpenses]);

  const vehicleAnalytics = useMemo(() => {
    const bookingsByVehicle = new Map<string, FinanceBooking[]>();
    const expensesByVehicle = new Map<string, typeof allExpenses>();

    revenueBookings.forEach((b) => {
      if (!bookingsByVehicle.has(b.vehicle_id)) bookingsByVehicle.set(b.vehicle_id, []);
      bookingsByVehicle.get(b.vehicle_id)!.push(b);
    });
    const turoRevenueByVehicle = new Map<string, number>();
    turoRevenueEntries.forEach((entry) => {
      turoRevenueByVehicle.set(
        entry.vehicle_id,
        (turoRevenueByVehicle.get(entry.vehicle_id) || 0) + entry.revenue
      );
    });

    allExpenses.forEach((e) => {
      if (e.vehicle_id) {
        if (!expensesByVehicle.has(e.vehicle_id)) expensesByVehicle.set(e.vehicle_id, []);
        expensesByVehicle.get(e.vehicle_id)!.push(e);
      }
    });

    return vehicles
      .map((vehicle) => {
        const vBookings = bookingsByVehicle.get(vehicle.id) ?? [];
        const vExpenses = expensesByVehicle.get(vehicle.id) ?? [];
        const bookingRevenue = vBookings.reduce(
          (s, b) =>
            s +
            prorateBookingRevenueInRange(
              b.total_price ?? 0,
              b.pickup_date,
              b.return_date,
              dateRange.from,
              dateRange.to
            ),
          0
        );
        const turoRevenue = turoRevenueByVehicle.get(vehicle.id) || 0;
        const revenue = bookingRevenue + turoRevenue;
        const expenseTotal = vExpenses.reduce((s, e) => s + (e.amount ?? 0), 0);
        const vehicleCost = vehicle.isFinanced ? 0 : (vehicle.purchasePrice ?? 0);

        const totalDaysInRange = Math.max(1, countInclusiveTripDays(dateRange.from, dateRange.to));
        let bookedDays = 0;
        vBookings.forEach((b) => {
          bookedDays += countBookedDaysInRange(
            b.pickup_date,
            b.return_date,
            dateRange.from,
            dateRange.to
          );
        });

        return {
          id: vehicle.id,
          name: getVehicleDisplayName(vehicle),
          bookings: vBookings.length,
          revenue,
          expenses: expenseTotal + vehicleCost,
          profit: revenue - expenseTotal - vehicleCost,
          occupancy: Math.min(100, (bookedDays / totalDaysInRange) * 100),
          bookedDays,
        };
      })
      .sort((a, b) => b.profit - a.profit);
  }, [vehicles, revenueBookings, turoRevenueEntries, allExpenses, dateRange]);

  const revenueByMonth = useMemo(() => {
    const monthLabels = buildMonthRange(dateRange.from, dateRange.to);
    const months: Record<string, { month: string; date: string; revenue: number; bookings: number }> = {};

    Object.entries(monthLabels).forEach(([key, label]) => {
      months[key] = { month: label, date: key, revenue: 0, bookings: 0 };
    });

    const bookingsCountedByMonth = new Set<string>();
    revenueBookings.forEach((b) => {
      forEachProratedBookingDayInRange(
        b.pickup_date,
        b.return_date,
        b.total_price ?? 0,
        dateRange.from,
        dateRange.to,
        (_dayStr, monthKey, amt) => {
          if (months[monthKey]) {
            months[monthKey].revenue += amt;
            const countKey = `${b.id}:${monthKey}`;
            if (!bookingsCountedByMonth.has(countKey)) {
              bookingsCountedByMonth.add(countKey);
              months[monthKey].bookings += 1;
            }
          }
        }
      );
    });
    blockedDates
      .filter(
        (b) =>
          isActiveTuroFinanceBlock(b) &&
          b.start_date <= dateRange.to &&
          b.end_date >= dateRange.from
      )
      .forEach((block) => {
        const R = resolveTuroTripRevenue(block);
        forEachProratedTuroDay(block, R, (_dayStr, monthKey, amt) => {
          if (months[monthKey]) months[monthKey].revenue += amt;
        });
      });

    return Object.values(months).map((m) => ({
      ...m,
      revenue: Math.round(m.revenue),
    }));
  }, [revenueBookings, blockedDates, dateRange]);

  const monthlyProfitData = useMemo(() => {
    const monthLabels = buildMonthRange(dateRange.from, dateRange.to);
    const months: Record<string, { month: string; date: string; revenue: number; expenses: number }> = {};

    Object.entries(monthLabels).forEach(([key, label]) => {
      months[key] = { month: label, date: key, revenue: 0, expenses: 0 };
    });

    revenueBookings.forEach((b) => {
      forEachProratedBookingDayInRange(
        b.pickup_date,
        b.return_date,
        b.total_price ?? 0,
        dateRange.from,
        dateRange.to,
        (_dayStr, monthKey, amt) => {
          if (months[monthKey]) months[monthKey].revenue += amt;
        }
      );
    });
    blockedDates
      .filter(
        (b) =>
          isActiveTuroFinanceBlock(b) &&
          b.start_date <= dateRange.to &&
          b.end_date >= dateRange.from
      )
      .forEach((block) => {
        const R = resolveTuroTripRevenue(block);
        forEachProratedTuroDay(block, R, (_dayStr, monthKey, amt) => {
          if (months[monthKey]) months[monthKey].revenue += amt;
        });
      });

    allExpenses.forEach((e) => {
      const key = e.date.substring(0, 7);
      if (months[key]) months[key].expenses += e.amount ?? 0;
    });

    return Object.values(months).map((m) => ({
      ...m,
      revenue: Math.round(m.revenue),
      expenses: Math.round(m.expenses),
      profit: Math.round(m.revenue - m.expenses),
    }));
  }, [revenueBookings, blockedDates, allExpenses, dateRange]);

  const vehicleMap = useMemo(() => {
    const map = new Map<string, Vehicle>();
    vehicles.forEach((v) => map.set(v.id, v));
    return map;
  }, [vehicles]);

  const allTimeDailyRevenue = useMemo(() => {
    const dayMap: Record<
      string,
      { date: string; revenue: number; bookingCount: number; bookings: FinanceBooking[] }
    > = {};

    revenueBookings.forEach((b) => {
      forEachProratedBookingDayInRange(
        b.pickup_date,
        b.return_date,
        b.total_price ?? 0,
        dateRange.from,
        dateRange.to,
        (dayStr, _monthKey, amt) => {
          if (!dayMap[dayStr]) {
            dayMap[dayStr] = { date: dayStr, revenue: 0, bookingCount: 0, bookings: [] };
          }
          dayMap[dayStr].revenue += amt;
          if (!dayMap[dayStr].bookings.some((existing) => existing.id === b.id)) {
            dayMap[dayStr].bookingCount += 1;
            dayMap[dayStr].bookings.push(b);
          }
        }
      );
    });

    return Object.values(dayMap).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [revenueBookings, dateRange]);

  return {
    revenueBookings,
    turoRevenueEntries,
    tripExpenseTotalsByBlockedId,
    maintenanceCosts,
    financingCosts,
    ticketCosts,
    filteredExpenses,
    allExpenses,
    summaryData,
    cashFlowData,
    dailyEarningsData,
    expenseCategoryData,
    vehicleAnalytics,
    revenueByMonth,
    monthlyProfitData,
    vehicleMap,
    allTimeDailyRevenue,
  };
}
