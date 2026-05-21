import extrasData from "@/data/extras.json";
import type { BookingDbRow, BookingExtra } from "@/lib/types";
import {
  calculateExtrasTotal,
  calculatePricing,
  calculateRentalHours,
} from "@/lib/utils/price-calculator";
import {
  getBookingBalanceDue,
  getBookingDisplayTotal,
  getRecurringBillingSummary,
} from "@/lib/utils/recurring-booking";

const AVAILABLE_EXTRAS = extrasData as BookingExtra[];

export interface InvoiceLineItem {
  label: string;
  amount: number;
  /** Shown as negative / credit styling */
  isCredit?: boolean;
}

export interface BookingInvoiceData {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  vehicleName: string;
  pickupDate: string;
  returnDate: string;
  pickupTime?: string;
  returnTime?: string;
  pickupLocationName?: string;
  returnLocationName?: string;
  lineItems: InvoiceLineItem[];
  chargesTotal: number;
  amountPaid: number;
  balanceDue: number;
  invoiceDate: string;
  promoCode?: string;
}

function fmtMoney(n: number): string {
  return `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

function mapBookingExtras(
  bookingExtras: BookingDbRow["extras"],
): BookingExtra[] {
  const selected = (bookingExtras ?? []) as { id: string; selected?: boolean }[];
  return AVAILABLE_EXTRAS.map((ae) => {
    const match = selected.find((be) => be.id === ae.id);
    return { ...ae, selected: match?.selected ?? false };
  });
}

/**
 * Build invoice line items and totals from a booking row (and optional vehicle rate for breakdown).
 */
export function buildBookingInvoiceData(
  booking: Pick<
    BookingDbRow,
    | "id"
    | "customer_name"
    | "customer_email"
    | "vehicleName"
    | "pickup_date"
    | "return_date"
    | "pickup_time"
    | "return_time"
    | "total_price"
    | "deposit"
    | "extras"
    | "admin_notes"
    | "promo_code"
    | "discount_amount"
    | "location_surcharge"
    | "effective_total_price"
    | "pickup_location_name"
    | "return_location_name"
  >,
  options?: { vehicleDailyRate?: number | null },
): BookingInvoiceData {
  const displayTotal = getBookingDisplayTotal(booking);
  const balanceDue = getBookingBalanceDue(booking);
  const amountPaid = Math.max(0, Number(booking.deposit) || 0);
  const recurring = getRecurringBillingSummary(booking);
  const lineItems: InvoiceLineItem[] = [];

  if (recurring) {
    lineItems.push({
      label: `Weekly rental rate`,
      amount: recurring.weeklyRate,
    });
    lineItems.push({
      label: `Contract total (${recurring.weeksDue} week${recurring.weeksDue === 1 ? "" : "s"} due)`,
      amount: recurring.contractTotalToDate,
    });
  } else if (
    options?.vehicleDailyRate &&
    options.vehicleDailyRate > 0 &&
    booking.pickup_date &&
    booking.return_date
  ) {
    try {
      const hours = calculateRentalHours(
        booking.pickup_date,
        booking.return_date,
        booking.pickup_time,
        booking.return_time,
      );
      const mappedExtras = mapBookingExtras(booking.extras);
      const pricing = calculatePricing(hours, options.vehicleDailyRate, mappedExtras);

      lineItems.push({
        label: `Vehicle rental (${pricing.baseHours} hr${pricing.baseHours === 1 ? "" : "s"})`,
        amount: pricing.baseTotal,
      });

      for (const extra of pricing.extras) {
        if (extra.total > 0) {
          lineItems.push({ label: extra.name, amount: extra.total });
        }
      }

      if (pricing.insuranceDiscount > 0) {
        lineItems.push({
          label: "Insurance discount (15%)",
          amount: pricing.insuranceDiscount,
          isCredit: true,
        });
      }

      if (pricing.setupFee > 0) {
        lineItems.push({ label: "Booking setup fee", amount: pricing.setupFee });
      }

      if (pricing.tax > 0) {
        lineItems.push({ label: "Tax (8%)", amount: pricing.tax });
      }

      const surcharge = Math.max(0, Number(booking.location_surcharge) || 0);
      if (surcharge > 0) {
        lineItems.push({ label: "Location surcharge", amount: surcharge });
      }

      const discount = Math.max(0, Number(booking.discount_amount) || 0);
      if (discount > 0) {
        lineItems.push({
          label: booking.promo_code
            ? `Promo discount (${booking.promo_code})`
            : "Promo discount",
          amount: discount,
          isCredit: true,
        });
      }

      // If stored total differs from computed (manual edits), show adjustment
      const computedCharges =
        pricing.total + surcharge - discount;
      const storedTotal = Math.max(0, Number(booking.total_price) || 0);
      if (Math.abs(computedCharges - storedTotal) > 0.02 && storedTotal > 0) {
        lineItems.length = 0;
        lineItems.push({
          label: "Rental & fees (per booking record)",
          amount: storedTotal,
        });
      }
    } catch {
      lineItems.push({
        label: "Rental & fees",
        amount: displayTotal,
      });
    }
  } else {
    const surcharge = Math.max(0, Number(booking.location_surcharge) || 0);
    const discount = Math.max(0, Number(booking.discount_amount) || 0);
    const baseRental = Math.max(0, displayTotal - surcharge);

    lineItems.push({
      label: "Rental & fees",
      amount: baseRental > 0 ? baseRental : displayTotal,
    });

    if (surcharge > 0) {
      lineItems.push({ label: "Location surcharge", amount: surcharge });
    }

    if (discount > 0) {
      lineItems.push({
        label: booking.promo_code
          ? `Promo discount (${booking.promo_code})`
          : "Promo discount",
        amount: discount,
        isCredit: true,
      });
    }
  }

  const chargesTotal = recurring
    ? recurring.contractTotalToDate
    : lineItems.reduce((sum, item) => {
        return item.isCredit ? sum - item.amount : sum + item.amount;
      }, 0);

  const today = new Date();
  const invoiceDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return {
    bookingId: booking.id,
    customerName: booking.customer_name || "Valued Customer",
    customerEmail: booking.customer_email,
    vehicleName: booking.vehicleName || "Vehicle",
    pickupDate: booking.pickup_date,
    returnDate: booking.return_date,
    pickupTime: booking.pickup_time,
    returnTime: booking.return_time,
    pickupLocationName: booking.pickup_location_name,
    returnLocationName: booking.return_location_name,
    lineItems,
    chargesTotal: Math.max(0, Math.round(chargesTotal * 100) / 100),
    amountPaid,
    balanceDue,
    invoiceDate,
    promoCode: booking.promo_code || undefined,
  };
}

export { fmtMoney };
