"use client";

// Legal text should be reviewed by licensed counsel before production use.

import React from "react";
import {
  AGREEMENT_ESIGN_DISCLOSURE,
  RENTAL_AGREEMENT_SECTION_4A_AUTHORIZED,
  RENTAL_AGREEMENT_SECTION_4_PAYMENT_ADDENDUM,
  getInlineSectionsForPage,
} from "@/lib/agreement/rental-agreement-terms";
import { resolveAgreementBalanceDue, resolveAgreementDeposit } from "@/lib/agreement/agreement-deposit";
import {
  paymentMethodLabel,
  type AgreementBookingContext,
} from "@/lib/agreement/agreement-booking-context";
import { AGREEMENT_VERSION } from "@/lib/agreement/agreement-version";
import { AgreementInlineSection } from "@/components/agreement-inline-sections";

interface RentalAgreementInlineProps {
  vehicle?: {
    make: string;
    model: string;
    year: number;
    licensePlate?: string;
    vin?: string;
    color?: string;
    mileage?: number;
  } | null;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  pickupDate?: string;
  returnDate?: string;
  pickupTime?: string;
  returnTime?: string;
  totalPrice?: number;
  totalDays?: number;
  deposit?: number;
  agreementType?: "standard" | "weeklyRecurring";
  weeklyDueDay?: string;
  bookingContext?: AgreementBookingContext;
  /** Which page to display (1, 2, or 3). If omitted, shows all pages (scrollable). */
  currentPage?: number;
}

const formatDate = (d: string | undefined) => {
  if (!d) return "___________";
  const parts = d.split("-").map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return "___________";
  const [y, m, day] = parts;
  // Use local time to avoid off-by-one day errors from UTC conversion (Bug 40)
  const date = new Date(y, m - 1, day);
  if (isNaN(date.getTime())) return "___________";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

const formatTime = (t: string | undefined | null) => {
  if (!t) return "___________";
  const timeStr = t;
  const parts = timeStr.split(":").map(Number);
  const h = parts[0];
  const m = parts[1] ?? 0;
  if (isNaN(h) || h < 0 || h > 23) return timeStr;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
};

const Field = ({ value, width = "auto" }: { value?: string | number | null; width?: string }) => (
  <span
    className="inline-block border-b border-gray-400 min-w-[60px] px-1 text-gray-900 font-medium"
    style={{ width, maxWidth: "100%" }}
  >
    {value || "\u00A0"}
  </span>
);

/* ── PAGE 1 ── */
function Page1({
  vehicle,
  customerName,
  customerEmail,
  customerPhone,
  pickupDate,
  returnDate,
  pickupTime,
  returnTime,
  totalPrice,
  totalDays,
  deposit,
  agreementType = "standard",
  weeklyDueDay,
  bookingContext,
}: RentalAgreementInlineProps) {
  const depositAmount = resolveAgreementDeposit(deposit, totalPrice);
  const balanceDue = resolveAgreementBalanceDue(totalPrice, deposit);
  const paymentLabel = paymentMethodLabel(bookingContext?.paymentMethod);
  const isWeeklyRecurring = agreementType === "weeklyRecurring";

  return (
    <div className="p-6 pb-4">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex justify-center mb-2">
          <div className="bg-purple-100 rounded-lg px-3 py-1">
            <span className="text-purple-700 font-bold text-sm tracking-wider">NEXTGEARAUTO</span>
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          {isWeeklyRecurring ? "WEEK-TO-WEEK LONG-TERM RENTAL AGREEMENT" : "VEHICLE RENTAL AGREEMENT"}
        </h2>
        <p className="text-sm text-gray-600">Next Gear Auto LLC</p>
        <p className="text-sm text-gray-600">92 Forrest Street, Jersey City, NJ 07304</p>
        <p className="text-sm text-gray-600">
          Phone: (551) 429-3472 | Email: contact@rentnextgearauto.com
        </p>
        <p className="text-[11px] text-gray-400 mt-1">Agreement version {AGREEMENT_VERSION}</p>
      </div>

      {/* Vehicle Information */}
      <div className="mb-5">
        <h3 className="font-bold text-sm text-gray-900 border-b border-gray-300 pb-1 mb-3">
          VEHICLE INFORMATION
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 sm:gap-x-6 gap-y-2">
          <div><span className="font-semibold">Make & Model:</span>{" "}<Field value={vehicle && vehicle.make && vehicle.model ? `${vehicle.make} ${vehicle.model}`.trim() : undefined} width="180px" /></div>
          <div><span className="font-semibold">Year:</span>{" "}<Field value={vehicle?.year ? String(vehicle.year) : undefined} width="80px" /></div>
          <div><span className="font-semibold">License Plate:</span>{" "}<Field value={vehicle?.licensePlate || undefined} width="120px" /></div>
          <div><span className="font-semibold">VIN:</span>{" "}<Field value={vehicle?.vin || undefined} width="180px" /></div>
          <div><span className="font-semibold">Color:</span>{" "}<Field value={vehicle?.color || undefined} width="100px" /></div>
          <div><span className="font-semibold">Mileage:</span>{" "}<Field value={vehicle?.mileage && Number.isFinite(Number(vehicle.mileage)) ? `${Number(vehicle.mileage).toLocaleString()} mi` : undefined} width="120px" /></div>
        </div>
        <div className="mt-2">
          <span className="font-semibold">Condition:</span>{" "}
          <span className="inline-flex gap-3 ml-2">
            <label className="inline-flex items-center gap-1"><span role="img" aria-label="unchecked" className="w-3.5 h-3.5 border border-gray-400 rounded-sm inline-block" /> Excellent</label>
            <label className="inline-flex items-center gap-1"><span role="img" aria-label="checked" className="w-3.5 h-3.5 border border-gray-400 rounded-sm inline-block bg-purple-600" /> Good</label>
            <label className="inline-flex items-center gap-1"><span role="img" aria-label="unchecked" className="w-3.5 h-3.5 border border-gray-400 rounded-sm inline-block" /> Fair</label>
            <label className="inline-flex items-center gap-1"><span role="img" aria-label="unchecked" className="w-3.5 h-3.5 border border-gray-400 rounded-sm inline-block" /> Poor</label>
          </span>
        </div>
      </div>

      {/* Section 1 */}
      <div className="mb-5">
        <h3 className="font-bold text-sm text-gray-900 border-b border-gray-300 pb-1 mb-2">1. PARTIES & IDENTIFICATION</h3>
        <p className="mb-3 text-gray-700">
          This Vehicle Rental Agreement (&quot;Agreement&quot;) is entered into between Next Gear Auto LLC
          (&quot;Lessor&quot;) and the individual listed as Renter below. Renter affirms that all provided
          information is accurate and complete. Any misrepresentation voids all liability protections.
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <div><span className="font-semibold">Full Name:</span>{" "}<Field value={customerName} width="180px" /></div>
          <div><span className="font-semibold">Date of Birth:</span>{" "}<Field width="120px" /></div>
          <div><span className="font-semibold">Phone:</span>{" "}<Field value={customerPhone} width="150px" /></div>
          <div><span className="font-semibold">Email:</span>{" "}<Field value={customerEmail} width="200px" /></div>
        </div>
      </div>

      {/* Section 2 */}
      <div className="mb-5">
        <h3 className="font-bold text-sm text-gray-900 border-b border-gray-300 pb-1 mb-2">
          {isWeeklyRecurring ? "2. WEEKLY RENTAL TERM, RENEWAL & LATE FEES" : "2. RENTAL PERIOD & LATE FEES"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 sm:gap-x-6 gap-y-2 mb-2">
          <div>
            <span className="font-semibold">Rental Pickup:</span>{" "}<Field value={formatDate(pickupDate)} width="120px" />
            <span className="ml-2 font-semibold">at:</span>{" "}<Field value={formatTime(pickupTime)} width="120px" />
          </div>
          <div>
            <span className="font-semibold">Expected Return:</span>{" "}<Field value={formatDate(returnDate)} width="120px" />
            <span className="ml-2 font-semibold">at:</span>{" "}<Field value={formatTime(returnTime)} width="120px" />
          </div>
        </div>
        {(bookingContext?.pickupLocationName || bookingContext?.returnLocationName) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 mb-2 text-gray-700">
            {bookingContext.pickupLocationName && (
              <div>
                <span className="font-semibold">Pickup location:</span> {bookingContext.pickupLocationName}
              </div>
            )}
            {bookingContext.returnLocationName && (
              <div>
                <span className="font-semibold">Return location:</span> {bookingContext.returnLocationName}
              </div>
            )}
          </div>
        )}
        {isWeeklyRecurring ? (
          <p className="text-gray-700">
            This agreement is structured for recurring 7-day terms. Each weekly rebooking uses the same rate unless updated in writing before renewal.
            <span className="font-semibold text-gray-900"> Late Fee Policy: $75 per hour. Any time after 59 minutes late may be charged as a full additional rental day.</span>
          </p>
        ) : (
          <p className="font-semibold text-gray-900">Late Fee Policy: $75 per hour. Any time after 59 minutes late will be charged as a full additional rental day.</p>
        )}
      </div>

      {/* Section 3 */}
      <div className="mb-5">
        <h3 className="font-bold text-sm text-gray-900 border-b border-gray-300 pb-1 mb-2">3. AUTHORIZED DRIVERS</h3>
        <div className="grid grid-cols-1 gap-y-2 mb-2">
          <div className="flex flex-wrap gap-y-1"><span className="font-semibold">Primary Renter (age 18+):</span>{" "}<Field value={customerName} width="200px" /><span className="ml-4 font-semibold">Driver&apos;s Lic:</span>{" "}<Field width="120px" /></div>
          <div className="flex flex-wrap gap-y-1"><span className="font-semibold">Additional Driver (age 18+):</span>{" "}<Field width="200px" /><span className="ml-4 font-semibold">Driver&apos;s Lic:</span>{" "}<Field width="120px" /></div>
        </div>
        <p className="text-gray-700 max-w-prose">
          Only these two drivers are authorized to operate this vehicle. Any operation by an unauthorized
          driver voids insurance protections, triggers a $750 penalty, makes Renter fully liable for all
          damage and third-party claims, and authorizes immediate termination and lawful vehicle recovery.
        </p>
      </div>

      {/* Section 4 */}
      <div className="mb-5">
        <h3 className="font-bold text-sm text-gray-900 border-b border-gray-300 pb-1 mb-2">
          {isWeeklyRecurring ? "4. WEEKLY RECURRING RATE & PAYMENT TERMS" : "4. RENTAL RATES & PAYMENT TERMS"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 sm:gap-x-6 gap-y-2 mb-2">
          <div>
            <span className="font-semibold">{isWeeklyRecurring ? "Weekly Recurring Price: $" : "Total Rental Price: $"}</span>{" "}
            <Field value={totalPrice && Number.isFinite(totalPrice) ? totalPrice.toFixed(2) : "0.00"} width="100px" />
          </div>
          <div>
            <span className="font-semibold">{isWeeklyRecurring ? "Weekly Term (Days):" : "Total Days:"}</span>{" "}
            <Field value={isWeeklyRecurring ? 7 : totalDays} width="60px" />
          </div>
          <div><span className="font-semibold">Security Deposit:</span> ${Number.isFinite(depositAmount) ? depositAmount.toFixed(2) : "0.00"}</div>
          <div><span className="font-semibold">Balance Due at Pickup: $</span>{" "}<Field value={balanceDue && Number.isFinite(balanceDue) && balanceDue > 0 ? balanceDue.toFixed(2) : "0.00"} width="100px" /></div>
        </div>
        {isWeeklyRecurring && (
          <p className="text-gray-700 mb-2">
            Renewal Billing: Weekly recurring payment is due at the start of each new 7-day term.
          </p>
        )}
        {isWeeklyRecurring && weeklyDueDay && (
          <p className="text-gray-700 mb-2">
            Weekly payment due every <span className="font-semibold text-gray-900">{weeklyDueDay}</span>.
          </p>
        )}
        <div className="mb-2">
          <span className="font-semibold">Payment Method:</span>{" "}
          <span className="text-gray-900 font-medium">{paymentLabel}</span>
        </div>
        {bookingContext?.extrasSummary && (
          <p className="text-gray-700 mb-1">
            <span className="font-semibold">Extras:</span> {bookingContext.extrasSummary}
          </p>
        )}
        {bookingContext?.promoCode && (
          <p className="text-gray-700 mb-1">
            <span className="font-semibold">Promo:</span> {bookingContext.promoCode}
            {bookingContext.discountAmount
              ? ` (−$${bookingContext.discountAmount.toFixed(2)})`
              : ""}
          </p>
        )}
        {bookingContext?.insuranceOptedOut && (
          <p className="text-gray-700 mb-1">
            <span className="font-semibold">Insurance:</span> Temporary coverage selected ($9/day).
          </p>
        )}
        {bookingContext?.insuranceProofOnFile && !bookingContext.insuranceOptedOut && (
          <p className="text-gray-700 mb-1">
            <span className="font-semibold">Insurance:</span> Proof on file for this booking.
          </p>
        )}
        <p className="text-gray-700"><strong>Included:</strong> 200 miles per day</p>
        <p className="text-gray-700"><strong>Extra Miles:</strong> $0.39 per mile over 200/day</p>
        {RENTAL_AGREEMENT_SECTION_4_PAYMENT_ADDENDUM.paragraphs.map((p) => (
          <p key={p.slice(0, 40)} className="text-gray-700 mt-2 max-w-prose">{p}</p>
        ))}
        <p className="font-semibold text-gray-900 mt-3 mb-1">{RENTAL_AGREEMENT_SECTION_4A_AUTHORIZED.title}</p>
        {RENTAL_AGREEMENT_SECTION_4A_AUTHORIZED.paragraphs.map((p) => (
          <p key={p.slice(0, 40)} className="text-gray-700 max-w-prose">{p}</p>
        ))}
      </div>

      <div className="border-t border-dashed border-gray-300 my-4" />
      <p className="text-center text-[11px] text-gray-400 italic">Page 1 of 3 — Renter Signature Required</p>
    </div>
  );
}

/* ── PAGE 2 ── */
function Page2() {
  return (
    <div className="p-6 pt-4 pb-4">
      {getInlineSectionsForPage(2).map((section) => (
        <AgreementInlineSection key={section.title} section={section}>
          {section.title.startsWith("6.") && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-2 sm:gap-x-4 gap-y-2 mb-2 mt-2">
              <div><span className="font-semibold">Insurance Provider:</span> <Field width="120px" /></div>
              <div><span className="font-semibold">Policy #:</span> <Field width="120px" /></div>
              <div><span className="font-semibold">Phone:</span> <Field width="120px" /></div>
            </div>
          )}
        </AgreementInlineSection>
      ))}

      <div className="border-t border-dashed border-gray-300 my-4" />
      <p className="text-center text-[11px] text-gray-400 italic">Page 2 of 3 — GPS Acknowledgement & Renter Signatures Required</p>
    </div>
  );
}

/* ── PAGE 3 ── */
function Page3({ customerName }: { customerName?: string }) {
  return (
    <div className="p-6 pt-4">
      {getInlineSectionsForPage(3).map((section) => (
        <AgreementInlineSection key={section.title} section={section} />
      ))}

      {/* Signatures Section */}
      <div className="mb-4">
        <h3 className="font-bold text-sm text-gray-900 border-b-2 border-gray-900 pb-1 mb-2">SIGNATURES & ACKNOWLEDGMENT</h3>
        <p className="italic text-gray-700 mb-4 max-w-prose">
          By signing below, Renter acknowledges reading, understanding, and agreeing to all terms including
          payment obligations, unpaid balance remedies, GPS tracking, and indemnification.
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 sm:gap-x-6">
            <div><span className="font-semibold">Renter Name (Print):</span>{" "}<Field value={customerName} width="200px" /></div>
            <div><span className="font-semibold">Date:</span> <Field width="120px" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 sm:gap-x-6">
            <div><span className="font-semibold">Renter Signature:</span>{" "}<Field width="250px" /></div>
            <div><span className="font-semibold">Time:</span> <Field width="120px" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 sm:gap-x-6">
            <div><span className="font-semibold">NGA Representative:</span>{" "}<Field value="NextGear Auto" width="200px" /></div>
            <div><span className="font-semibold">Date:</span> <Field width="120px" /></div>
          </div>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-300 my-4" />
      <p className="text-center text-[11px] text-gray-400 italic">Page 3 of 3 — Renter Signatures Required</p>
    </div>
  );
}

export function RentalAgreementInline({
  vehicle,
  customerName,
  customerEmail,
  customerPhone,
  pickupDate,
  returnDate,
  pickupTime,
  returnTime,
  totalPrice,
  totalDays,
  deposit,
  agreementType = "standard",
  weeklyDueDay,
  bookingContext,
  currentPage,
}: RentalAgreementInlineProps) {
  const pageProps = {
    vehicle,
    customerName,
    customerEmail,
    customerPhone,
    pickupDate,
    returnDate,
    pickupTime,
    returnTime,
    totalPrice,
    totalDays,
    deposit,
    agreementType,
    weeklyDueDay,
    bookingContext,
  };

  // If no currentPage specified, show the page-based view with page 1 default
  const page = currentPage || 1;

  return (
    <div className="bg-white rounded-lg border border-gray-200 text-[13px] leading-relaxed text-gray-800">
      {page === 1 && <Page1 {...pageProps} />}
      {page === 2 && <Page2 />}
      {page === 3 && <Page3 customerName={customerName} />}

      {/* Page indicator */}
      <div className="flex justify-center gap-2 pb-4">
        {[1, 2, 3].map((p) => (
          <div
            key={p}
            className={`h-2 w-8 rounded-full transition-colors ${
              p === page ? "bg-purple-600" : "bg-gray-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
