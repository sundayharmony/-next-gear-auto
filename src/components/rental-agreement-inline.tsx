"use client";

import React from "react";

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
  /** Which page to display (1, 2, or 3). If omitted, shows all pages (scrollable). */
  currentPage?: number;
}

const formatDate = (d: string | undefined) => {
  if (!d) return "___________";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

const formatTime = (t: string | undefined | null) => {
  if (!t) return "___________";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
};

const Field = ({ value, width = "auto" }: { value?: string | number | null; width?: string }) => (
  <span
    className="inline-block border-b border-gray-400 min-w-[80px] px-1 text-gray-900 font-medium"
    style={{ width }}
  >
    {value || "\u00A0"}
  </span>
);

/* ── PAGE 1 ── */
function Page1({ vehicle, customerName, customerEmail, customerPhone, pickupDate, returnDate, pickupTime, returnTime, totalPrice, totalDays }: RentalAgreementInlineProps) {
  const balanceDue = (totalPrice || 0) - 50;

  return (
    <div className="p-6 pb-4">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex justify-center mb-2">
          <div className="bg-purple-100 rounded-lg px-3 py-1">
            <span className="text-purple-700 font-bold text-sm tracking-wider">NEXTGEARAUTO</span>
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">VEHICLE RENTAL AGREEMENT</h2>
        <p className="text-sm text-gray-600">Next Gear Auto LLC</p>
        <p className="text-sm text-gray-600">92 Forrest Street, Jersey City, NJ 07304</p>
        <p className="text-sm text-gray-600">
          Phone: (551) 429-3472 | Email: contact@rentnextgearauto.com
        </p>
      </div>

      {/* Vehicle Information */}
      <div className="mb-5">
        <h3 className="font-bold text-sm text-gray-900 border-b border-gray-300 pb-1 mb-3">
          VEHICLE INFORMATION
        </h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <div><span className="font-semibold">Make & Model:</span>{" "}<Field value={vehicle ? `${vehicle.make} ${vehicle.model}` : undefined} width="180px" /></div>
          <div><span className="font-semibold">Year:</span>{" "}<Field value={vehicle?.year} width="80px" /></div>
          <div><span className="font-semibold">License Plate:</span>{" "}<Field value={vehicle?.licensePlate} width="120px" /></div>
          <div><span className="font-semibold">VIN:</span>{" "}<Field value={vehicle?.vin} width="180px" /></div>
          <div><span className="font-semibold">Color:</span>{" "}<Field value={vehicle?.color} width="100px" /></div>
          <div><span className="font-semibold">Mileage:</span>{" "}<Field value={vehicle?.mileage ? `${Number(vehicle.mileage).toLocaleString()} mi` : undefined} width="120px" /></div>
        </div>
        <div className="mt-2">
          <span className="font-semibold">Condition:</span>{" "}
          <span className="inline-flex gap-3 ml-2">
            <label className="inline-flex items-center gap-1"><span className="w-3.5 h-3.5 border border-gray-400 rounded-sm inline-block" /> Excellent</label>
            <label className="inline-flex items-center gap-1"><span className="w-3.5 h-3.5 border border-gray-400 rounded-sm inline-block bg-purple-600" /> Good</label>
            <label className="inline-flex items-center gap-1"><span className="w-3.5 h-3.5 border border-gray-400 rounded-sm inline-block" /> Fair</label>
            <label className="inline-flex items-center gap-1"><span className="w-3.5 h-3.5 border border-gray-400 rounded-sm inline-block" /> Poor</label>
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
        <h3 className="font-bold text-sm text-gray-900 border-b border-gray-300 pb-1 mb-2">2. RENTAL PERIOD & LATE FEES</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-2">
          <div>
            <span className="font-semibold">Rental Pickup:</span>{" "}<Field value={formatDate(pickupDate)} width="120px" />
            <span className="ml-2 font-semibold">at:</span>{" "}<Field value={formatTime(pickupTime)} width="120px" />
          </div>
          <div>
            <span className="font-semibold">Expected Return:</span>{" "}<Field value={formatDate(returnDate)} width="120px" />
            <span className="ml-2 font-semibold">at:</span>{" "}<Field value={formatTime(returnTime)} width="120px" />
          </div>
        </div>
        <p className="font-semibold text-gray-900">Late Fee Policy: $75 per hour. Any time after 59 minutes late will be charged as a full additional rental day.</p>
      </div>

      {/* Section 3 */}
      <div className="mb-5">
        <h3 className="font-bold text-sm text-gray-900 border-b border-gray-300 pb-1 mb-2">3. AUTHORIZED DRIVERS</h3>
        <div className="grid grid-cols-1 gap-y-2 mb-2">
          <div><span className="font-semibold">Primary Renter (age 18+):</span>{" "}<Field value={customerName} width="200px" /><span className="ml-4 font-semibold">Driver&apos;s Lic:</span>{" "}<Field width="120px" /></div>
          <div><span className="font-semibold">Additional Driver (age 18+):</span>{" "}<Field width="200px" /><span className="ml-4 font-semibold">Driver&apos;s Lic:</span>{" "}<Field width="120px" /></div>
        </div>
        <p className="text-gray-700">Only these two drivers are authorized to operate this vehicle. Unauthorized drivers will result in: $750 penalty, full liability for all damage, and immediate agreement termination.</p>
      </div>

      {/* Section 4 */}
      <div className="mb-5">
        <h3 className="font-bold text-sm text-gray-900 border-b border-gray-300 pb-1 mb-2">4. RENTAL RATES & PAYMENT TERMS</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-2">
          <div><span className="font-semibold">Total Rental Price: $</span>{" "}<Field value={totalPrice ? totalPrice.toFixed(2) : undefined} width="100px" /></div>
          <div><span className="font-semibold">Total Days:</span>{" "}<Field value={totalDays} width="60px" /></div>
          <div><span className="font-semibold">Security Deposit:</span> $50.00</div>
          <div><span className="font-semibold">Balance Due at Pickup: $</span>{" "}<Field value={balanceDue > 0 ? balanceDue.toFixed(2) : "0.00"} width="100px" /></div>
        </div>
        <div className="mb-2">
          <span className="font-semibold">Payment Method:</span>{" "}
          <span className="inline-flex gap-3 ml-2">
            <label className="inline-flex items-center gap-1"><span className="w-3.5 h-3.5 border border-gray-400 rounded-sm inline-block" /> Cash</label>
            <label className="inline-flex items-center gap-1"><span className="w-3.5 h-3.5 border border-gray-400 rounded-sm inline-block" /> Zelle</label>
            <label className="inline-flex items-center gap-1"><span className="w-3.5 h-3.5 border border-gray-400 rounded-sm inline-block bg-purple-600" /> Credit/Debit</label>
          </span>
        </div>
        <p className="text-gray-700"><strong>Included:</strong> 200 miles per day</p>
        <p className="text-gray-700"><strong>Extra Miles:</strong> $0.39 per mile over 200/day</p>
      </div>

      <div className="border-t border-dashed border-gray-300 my-4" />
      <p className="text-center text-[11px] text-gray-400 italic">Page 1 of 3 — Renter Initials Required</p>
    </div>
  );
}

/* ── PAGE 2 ── */
function Page2() {
  return (
    <div className="p-6 pt-4 pb-4">
      {/* Section 5 */}
      <div className="mb-5">
        <h3 className="font-bold text-sm text-gray-900 border-b border-gray-300 pb-1 mb-2">5. INSURANCE REQUIREMENTS</h3>
        <p className="mb-2 text-gray-700">Renter MUST provide proof of active auto insurance meeting New Jersey minimum requirements.</p>
        <div className="grid grid-cols-3 gap-x-4 gap-y-2 mb-2">
          <div><span className="font-semibold">Insurance Provider:</span> <Field width="120px" /></div>
          <div><span className="font-semibold">Policy #:</span> <Field width="120px" /></div>
          <div><span className="font-semibold">Phone:</span> <Field width="120px" /></div>
        </div>
        <p className="text-gray-700 mb-1">If proof of insurance is not provided, temporary Non-Owned Auto Coverage will be added at $12/day.</p>
        <p className="text-gray-700"><strong>Optional Supplemental Liability Protection (SLP):</strong> $14.99/day (up to $1M)</p>
      </div>

      {/* Section 6 */}
      <div className="mb-5">
        <h3 className="font-bold text-sm text-gray-900 border-b border-gray-300 pb-1 mb-2">6. LIABILITY & DAMAGE RESPONSIBILITY</h3>
        <p className="text-gray-700">
          Renter is fully and completely responsible for ALL vehicle damage regardless of cause or fault.
          This includes but is not limited to: collision damage, theft, vandalism, weather damage,
          tire/rim/undercarriage damage, windshield damage, lost or damaged keys ($350 replacement cost),
          towing and impound fees, storage charges, diminished vehicle value (up to $5,000), and loss of
          use charges (daily rental rate x number of days vehicle is unavailable).
        </p>
      </div>

      {/* Section 7 */}
      <div className="mb-5">
        <h3 className="font-bold text-sm text-gray-900 border-b border-gray-300 pb-1 mb-2">7. INDEMNIFICATION & HOLD HARMLESS</h3>
        <p className="text-gray-700">
          Renter agrees to indemnify, defend, and hold harmless Next Gear Auto LLC, its owners, employees,
          and agents from and against any and all claims, demands, losses, liabilities, damages, costs, and
          expenses (including reasonable attorney fees) arising out of or related to Renter&apos;s use,
          operation, or possession of the vehicle during the rental period. This includes, without
          limitation, claims by third parties for bodily injury, property damage, or death resulting from
          any accident, incident, or occurrence involving the rented vehicle, regardless of fault.
        </p>
      </div>

      {/* Section 8 */}
      <div className="mb-5">
        <h3 className="font-bold text-sm text-gray-900 border-b border-gray-300 pb-1 mb-2">8. PROHIBITED USES</h3>
        <p className="mb-2 text-gray-700">The following are strictly prohibited ($1,500 penalty + full liability):</p>
        <ul className="list-disc list-inside text-gray-700 space-y-0.5 ml-2">
          <li>Operating by unauthorized drivers</li>
          <li>Commercial use (Uber, Lyft, DoorDash, etc.)</li>
          <li>Off-road driving, racing, drifting, or aggressive driving</li>
          <li>Exceeding passenger capacity</li>
          <li>Leaving vehicle running and unattended</li>
          <li>Crossing U.S. borders (Canada/Mexico prohibited)</li>
        </ul>
      </div>

      {/* Section 9 */}
      <div className="mb-5">
        <h3 className="font-bold text-sm text-gray-900 border-b border-gray-300 pb-1 mb-2">9. GPS / VEHICLE TRACKING DISCLOSURE</h3>
        <p className="text-gray-700 mb-2">
          Renter acknowledges and agrees that the vehicle may be equipped with a GPS tracking device or
          similar telematics system. This technology may record and transmit vehicle location, speed,
          mileage, and other operational data for vehicle recovery, mileage verification, safety
          monitoring, and fleet management.
        </p>
        <p className="font-semibold text-gray-900">I acknowledge and consent to GPS/vehicle tracking during the rental period.</p>
      </div>

      <div className="border-t border-dashed border-gray-300 my-4" />
      <p className="text-center text-[11px] text-gray-400 italic">Page 2 of 3 — GPS Acknowledgement & Renter Initials Required</p>
    </div>
  );
}

/* ── PAGE 3 ── */
function Page3({ customerName }: { customerName?: string }) {
  return (
    <div className="p-6 pt-4">
      {/* Section 10 */}
      <div className="mb-5">
        <h3 className="font-bold text-sm text-gray-900 border-b border-gray-300 pb-1 mb-2">10. PETS & CLEANLINESS</h3>
        <p className="text-gray-700">
          Pets are allowed ONLY if the vehicle is returned in completely clean condition with no pet hair,
          odors, or damage. Pet-related cleaning charges: $150-$350 depending on condition.
        </p>
      </div>

      {/* Section 11 */}
      <div className="mb-5">
        <h3 className="font-bold text-sm text-gray-900 border-b border-gray-300 pb-1 mb-2">11. VEHICLE RETURN CONDITIONS</h3>
        <p className="text-gray-700">
          Vehicle must be returned: (1) Clean inside and out (2) Full fuel tank (3) Without any new damage
          (4) With all original accessories and documentation (5) At or before scheduled return time
        </p>
      </div>

      {/* Section 12 */}
      <div className="mb-5">
        <h3 className="font-bold text-sm text-gray-900 border-b border-gray-300 pb-1 mb-2">12. ACCIDENT & THEFT PROCEDURES</h3>
        <p className="text-gray-700">
          In the event of any accident or theft, Renter MUST immediately: (1) Call 911 (2) Contact Next
          Gear Auto at (551) 429-3472 (3) File a police report the same day. Failure to follow these steps
          immediately may void all insurance coverage and result in renter liability for full replacement
          value.
        </p>
      </div>

      {/* Section 13 */}
      <div className="mb-5">
        <h3 className="font-bold text-sm text-gray-900 border-b border-gray-300 pb-1 mb-2">13. FRAUD & MISREPRESENTATION</h3>
        <p className="text-gray-700">
          Providing false identification, fraudulent insurance information, or invalid payment methods will
          result in immediate contract termination, full liability for vehicle value, and potential criminal
          prosecution.
        </p>
      </div>

      {/* Section 14 */}
      <div className="mb-5">
        <h3 className="font-bold text-sm text-gray-900 border-b border-gray-300 pb-1 mb-2">14. GOVERNING LAW</h3>
        <p className="text-gray-700">
          This Agreement is governed by the laws of the State of New Jersey, Hudson County. Venue is Hudson
          County Superior Court. Both parties waive jury trial and class action rights. The prevailing party
          is entitled to reasonable attorney fees.
        </p>
      </div>

      {/* Signatures Section */}
      <div className="mb-4">
        <h3 className="font-bold text-sm text-gray-900 border-b-2 border-gray-900 pb-1 mb-2">SIGNATURES & ACKNOWLEDGMENT</h3>
        <p className="italic text-gray-700 mb-4">
          By signing below, Renter acknowledges reading, understanding, and agreeing to all terms including
          GPS tracking and indemnification.
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-x-6">
            <div><span className="font-semibold">Renter Name (Print):</span>{" "}<Field value={customerName} width="200px" /></div>
            <div><span className="font-semibold">Date:</span> <Field width="120px" /></div>
          </div>
          <div className="grid grid-cols-2 gap-x-6">
            <div><span className="font-semibold">Renter Signature:</span>{" "}<Field width="250px" /></div>
            <div><span className="font-semibold">Time:</span> <Field width="120px" /></div>
          </div>
          <div className="grid grid-cols-2 gap-x-6">
            <div><span className="font-semibold">NGA Representative:</span>{" "}<Field value="NextGear Auto" width="200px" /></div>
            <div><span className="font-semibold">Date:</span> <Field width="120px" /></div>
          </div>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-300 my-4" />
      <p className="text-center text-[11px] text-gray-400 italic">Page 3 of 3 — Full Signature & Final Initials Required</p>
    </div>
  );
}

/**
 * Maps agreement signature step (0-4) to page number (1-3).
 * Steps 0,1 → Page 1 | Step 2 → Page 2 | Steps 3,4 → Page 3
 */
export function getPageForStep(step: number): number {
  if (step <= 1) return 1;
  if (step === 2) return 2;
  return 3;
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
  currentPage,
}: RentalAgreementInlineProps) {
  const pageProps = { vehicle, customerName, customerEmail, customerPhone, pickupDate, returnDate, pickupTime, returnTime, totalPrice, totalDays };

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
