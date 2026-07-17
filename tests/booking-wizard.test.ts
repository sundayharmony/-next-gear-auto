import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rangesConflictWithSelection } from "../src/lib/booking/booked-ranges";
import {
  canProceedForStep,
  getStep1ValidationError,
  isCustomerAtLeast18,
  isVehicleBookedForSelection,
  type CanProceedInput,
  type SearchDatesState,
} from "../src/lib/booking/wizard-validation";
import type { BookingExtra, Vehicle } from "../src/lib/types";

const baseSearchDates: SearchDatesState = {
  pickup: "2099-07-01",
  return: "2099-07-03",
  pickupTime: "10:00",
  returnTime: "10:00",
};

const mockVehicle: Vehicle = {
  id: "v1",
  year: 2024,
  make: "Toyota",
  model: "Camry",
  category: "sedan" as const,
  images: [],
  specs: { passengers: 5, luggage: 2, mpg: 30, transmission: "Automatic", fuelType: "Gasoline", doors: 4 },
  dailyRate: 80,
  features: [],
  isAvailable: true,
  description: "",
  color: "white",
  mileage: 10000,
  licensePlate: "ABC123",
  vin: "VIN123",
  maintenanceStatus: "good",
};

const mockExtras: BookingExtra[] = [
  {
    id: "e1",
    name: "Insurance",
    description: "Coverage",
    pricePerDay: 11.25,
    maxPrice: null,
    selected: true,
    billingType: "per-day",
  },
];

function baseCanProceed(overrides: Partial<CanProceedInput> = {}): CanProceedInput {
  return {
    step: 1,
    searchDates: baseSearchDates,
    locationsCount: 0,
    selectedPickupLocation: "",
    selectedVehicle: mockVehicle,
    checkingAvailability: false,
    availabilityError: null,
    vehicleBookedDates: {},
    pickupDate: baseSearchDates.pickup,
    returnDate: baseSearchDates.return,
    pickupTime: baseSearchDates.pickupTime,
    returnTime: baseSearchDates.returnTime,
    localExtras: mockExtras,
    insuranceProofUrl: null,
    details: { name: "Jane Doe", email: "jane@example.com", phone: "5551234567", dob: "1990-01-15" },
    idDocumentUrl: "https://example.com/id.jpg",
    uploadingId: false,
    agreementSignatures: { sig1: "data:image/png;base64,abc" },
    signedName: "Jane Doe",
    agreementFieldIds: ["sig1"],
    ...overrides,
  };
}

describe("getStep1ValidationError", () => {
  it("returns null when dates incomplete", () => {
    assert.equal(
      getStep1ValidationError({
        searchDates: { pickup: "", return: "", pickupTime: "10:00", returnTime: "10:00" },
        locationsCount: 0,
        selectedPickupLocation: "",
      }),
      null
    );
  });

  it("rejects return before pickup", () => {
    assert.equal(
      getStep1ValidationError({
        searchDates: { pickup: "2099-07-05", return: "2099-07-03", pickupTime: "10:00", returnTime: "10:00" },
        locationsCount: 0,
        selectedPickupLocation: "",
      }),
      "Return date must be on or after pick-up date"
    );
  });

  it("requires pickup location when locations exist", () => {
    assert.equal(
      getStep1ValidationError({
        searchDates: baseSearchDates,
        locationsCount: 2,
        selectedPickupLocation: "",
      }),
      "Please select a pickup location"
    );
  });

  it("requires public pickup to be at least 24 hours away", () => {
    const now = new Date("2030-07-17T13:00:00.000Z"); // 9:00 AM America/New_York
    const base = {
      return: "2030-07-20",
      returnTime: "10:00",
      locationsCount: 0,
      selectedPickupLocation: "",
      now,
    };

    assert.equal(
      getStep1ValidationError({
        ...base,
        searchDates: {
          pickup: "2030-07-18",
          return: base.return,
          pickupTime: "08:59",
          returnTime: base.returnTime,
        },
      }),
      "Public bookings must be made at least 24 hours before pickup.",
    );
    assert.equal(
      getStep1ValidationError({
        ...base,
        searchDates: {
          pickup: "2030-07-18",
          return: base.return,
          pickupTime: "09:00",
          returnTime: base.returnTime,
        },
      }),
      null,
    );
  });
});

describe("isCustomerAtLeast18", () => {
  it("accepts adult DOB", () => {
    assert.equal(isCustomerAtLeast18("1990-06-01"), true);
  });

  it("rejects under-18 DOB", () => {
    const recent = new Date();
    recent.setFullYear(recent.getFullYear() - 10);
    const iso = recent.toISOString().slice(0, 10);
    assert.equal(isCustomerAtLeast18(iso), false);
  });
});

describe("canProceedForStep", () => {
  it("step 1 requires complete valid dates", () => {
    assert.equal(canProceedForStep(baseCanProceed({ step: 1 })), true);
    assert.equal(
      canProceedForStep(
        baseCanProceed({
          step: 1,
          searchDates: { ...baseSearchDates, return: "2099-06-01" },
        })
      ),
      false
    );
  });

  it("step 2 blocks booked vehicle", () => {
    const booked = {
      v1: [
        {
          pickupDate: "2099-07-01",
          returnDate: "2099-07-03",
          pickupTime: "10:00",
          returnTime: "10:00",
        },
      ],
    };
    assert.equal(
      canProceedForStep(baseCanProceed({ step: 2, vehicleBookedDates: booked })),
      false
    );
  });

  it("step 3 requires insurance or proof", () => {
    assert.equal(canProceedForStep(baseCanProceed({ step: 3 })), true);
    assert.equal(
      canProceedForStep(
        baseCanProceed({
          step: 3,
          localExtras: [{ ...mockExtras[0], selected: false }],
          insuranceProofUrl: null,
        })
      ),
      false
    );
    assert.equal(
      canProceedForStep(
        baseCanProceed({
          step: 3,
          localExtras: [{ ...mockExtras[0], selected: false }],
          insuranceProofUrl: "https://example.com/proof.pdf",
        })
      ),
      true
    );
  });

  it("step 4 validates email and age", () => {
    assert.equal(canProceedForStep(baseCanProceed({ step: 4 })), true);
    assert.equal(
      canProceedForStep(
        baseCanProceed({
          step: 4,
          details: { ...baseCanProceed().details, email: "not-an-email" },
        })
      ),
      false
    );
  });

  it("step 5 requires uploaded ID", () => {
    assert.equal(canProceedForStep(baseCanProceed({ step: 5 })), true);
    assert.equal(
      canProceedForStep(baseCanProceed({ step: 5, idDocumentUrl: null })),
      false
    );
  });

  it("step 6 requires all signatures and legal name", () => {
    assert.equal(canProceedForStep(baseCanProceed({ step: 6 })), true);
    assert.equal(
      canProceedForStep(baseCanProceed({ step: 6, signedName: "" })),
      false
    );
  });
});

describe("isVehicleBookedForSelection / overlap helpers", () => {
  const ranges = [
    {
      pickupDate: "2026-06-10",
      returnDate: "2026-06-12",
      pickupTime: "10:00",
      returnTime: "10:00",
    },
  ];

  it("delegates to rangesConflictWithSelection", () => {
    assert.equal(
      isVehicleBookedForSelection("v1", { v1: ranges }, "2026-06-12", "2026-06-14", "09:30", "10:00"),
      true
    );
    assert.equal(
      isVehicleBookedForSelection("v1", { v1: ranges }, "2026-06-12", "2026-06-14", "12:00", "10:00"),
      false
    );
  });

  it("matches booked-ranges buffer behavior", () => {
    assert.equal(
      rangesConflictWithSelection(ranges, "2026-06-12", "2026-06-14", "09:30", "10:00"),
      isVehicleBookedForSelection("v1", { v1: ranges }, "2026-06-12", "2026-06-14", "09:30", "10:00")
    );
  });
});
