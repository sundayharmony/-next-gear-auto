import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getVehicleDisplayName } from "@/lib/types";
import { resolveAgreementBalanceDue, resolveAgreementDeposit } from "@/lib/agreement/agreement-deposit";
import { paymentMethodLabel, type AgreementBookingContext } from "@/lib/agreement/agreement-booking-context";
import { AGREEMENT_VERSION } from "@/lib/agreement/agreement-version";

const MARGIN = 50;
const FONT_SIZE = 9;
const LINE_HEIGHT = 12;

interface SummaryBooking {
  customer_name?: string | null;
  pickup_date?: string | null;
  return_date?: string | null;
  pickup_time?: string | null;
  return_time?: string | null;
  total_price?: number | null;
  deposit?: number | null;
}

interface SummaryVehicle {
  year?: number;
  make?: string;
  model?: string;
}

export async function appendRentalSummaryPage(
  pdfDoc: PDFDocument,
  booking: SummaryBooking,
  vehicle: SummaryVehicle | null,
  context: AgreementBookingContext,
): Promise<void> {
  const page = pdfDoc.addPage();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let y = page.getHeight() - MARGIN;

  const draw = (text: string, opts?: { bold?: boolean }) => {
    page.drawText(text, {
      x: MARGIN,
      y,
      size: FONT_SIZE,
      font: opts?.bold ? bold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= LINE_HEIGHT;
  };

  draw("RENTAL SUMMARY (BOOKING DETAILS)", { bold: true });
  draw(`Agreement version: ${AGREEMENT_VERSION}`);
  y -= 4;

  const vehicleName = vehicle ? getVehicleDisplayName(vehicle) : "—";
  draw(`Vehicle: ${vehicleName}`);
  draw(`Renter: ${booking.customer_name || "—"}`);
  draw(
    `Pickup: ${booking.pickup_date || "—"} ${booking.pickup_time || ""} @ ${context.pickupLocationName || "Default location"}`,
  );
  draw(
    `Return: ${booking.return_date || "—"} ${booking.return_time || ""} @ ${context.returnLocationName || "Default location"}`,
  );

  const total = booking.total_price ?? 0;
  const deposit = resolveAgreementDeposit(booking.deposit, total);
  const balance = resolveAgreementBalanceDue(total, booking.deposit);
  draw(`Total rental price: $${total.toFixed(2)}`);
  draw(`Security deposit: $${deposit.toFixed(2)}`);
  draw(`Balance due at pickup: $${balance.toFixed(2)}`);
  draw(`Payment method: ${paymentMethodLabel(context.paymentMethod)}`);

  if (context.extrasSummary) draw(`Extras: ${context.extrasSummary}`);
  if (context.promoCode) {
    draw(
      `Promo: ${context.promoCode}${context.discountAmount ? ` (−$${context.discountAmount.toFixed(2)})` : ""}`,
    );
  }

  if (context.insuranceOptedOut) {
    draw("Insurance: Renter opted for temporary coverage ($9/day) — proof required at pickup.");
  } else if (context.insuranceProofOnFile) {
    draw("Insurance: Proof of insurance on file for this booking.");
  } else {
    draw("Insurance: Renter to provide proof at pickup.");
  }
}
