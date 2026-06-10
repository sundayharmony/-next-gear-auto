import { rangesConflictWithSelection, type BookedRange } from "@/lib/booking/booked-ranges";
import { localMidnightFromYyyyMmDd } from "@/lib/utils/booking-dates";
import { calculateRentalHours } from "@/lib/utils/price-calculator";
import { isValidEmailFormat } from "@/lib/utils/validation";
import type { BookingExtra, Vehicle } from "@/lib/types";

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface SearchDatesState {
  pickup: string;
  return: string;
  pickupTime: string;
  returnTime: string;
}

export interface CustomerDetailsState {
  name: string;
  email: string;
  phone: string;
  dob: string;
}

export interface Step1ValidationInput {
  searchDates: SearchDatesState;
  locationsCount: number;
  selectedPickupLocation: string;
}

/** Pure validation for step 1 — safe to call during render (e.g. disabled button). */
export function getStep1ValidationError(input: Step1ValidationInput): string | null {
  const { searchDates, locationsCount, selectedPickupLocation } = input;

  if (!searchDates.pickup || !searchDates.return || !searchDates.pickupTime || !searchDates.returnTime) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pickupDate = localMidnightFromYyyyMmDd(searchDates.pickup);
  if (isNaN(pickupDate.getTime()) || pickupDate < today) {
    return "Pick-up date cannot be in the past";
  }

  const returnDate = localMidnightFromYyyyMmDd(searchDates.return);
  if (isNaN(returnDate.getTime())) {
    return "Please select valid pick-up and return dates";
  }

  if (returnDate < pickupDate) {
    return "Return date must be on or after pick-up date";
  }

  try {
    const rentalHours = calculateRentalHours(
      searchDates.pickup,
      searchDates.return,
      searchDates.pickupTime,
      searchDates.returnTime,
    );
    if (rentalHours > 90 * 24) {
      return "Maximum rental duration is 90 days";
    }
  } catch {
    return "Return time must be after pickup time";
  }

  if (locationsCount > 0 && !selectedPickupLocation) {
    return "Please select a pickup location";
  }

  return null;
}

/** Returns true when the customer is at least 18 years old. */
export function isCustomerAtLeast18(dob: string): boolean {
  const parsed = new Date(dob);
  if (isNaN(parsed.getTime())) return false;
  const today = new Date();
  const birthdayThisYear = new Date(today.getFullYear(), parsed.getMonth(), parsed.getDate());
  const age =
    birthdayThisYear > today
      ? today.getFullYear() - parsed.getFullYear() - 1
      : today.getFullYear() - parsed.getFullYear();
  return age >= 18;
}

export interface CanProceedInput {
  step: WizardStep;
  searchDates: SearchDatesState;
  locationsCount: number;
  selectedPickupLocation: string;
  selectedVehicle: Vehicle | null;
  checkingAvailability: boolean;
  availabilityError: string | null;
  vehicleBookedDates: Record<string, BookedRange[]>;
  pickupDate: string;
  returnDate: string;
  pickupTime: string;
  returnTime: string;
  localExtras: BookingExtra[];
  insuranceProofUrl: string | null;
  details: CustomerDetailsState;
  idDocumentUrl: string | null;
  uploadingId: boolean;
  agreementSignatures: Record<string, string | null>;
  signedName: string;
  agreementFieldIds: string[];
}

export function isVehicleBookedForSelection(
  vehicleId: string,
  vehicleBookedDates: Record<string, BookedRange[]>,
  pickupDate: string,
  returnDate: string,
  pickupTime: string,
  returnTime: string,
): boolean {
  return rangesConflictWithSelection(
    vehicleBookedDates[vehicleId],
    pickupDate,
    returnDate,
    pickupTime,
    returnTime,
  );
}

export function canProceedForStep(input: CanProceedInput): boolean {
  switch (input.step) {
    case 1:
      return (
        getStep1ValidationError({
          searchDates: input.searchDates,
          locationsCount: input.locationsCount,
          selectedPickupLocation: input.selectedPickupLocation,
        }) === null &&
        !!input.searchDates.pickup &&
        !!input.searchDates.return &&
        !!input.searchDates.pickupTime &&
        !!input.searchDates.returnTime
      );
    case 2:
      return (
        !!input.selectedVehicle &&
        !input.checkingAvailability &&
        !input.availabilityError &&
        !isVehicleBookedForSelection(
          input.selectedVehicle.id,
          input.vehicleBookedDates,
          input.pickupDate,
          input.returnDate,
          input.pickupTime,
          input.returnTime,
        )
      );
    case 3: {
      const insuranceExtra = input.localExtras.find((e) => e.id === "e1");
      if (insuranceExtra && !insuranceExtra.selected && !input.insuranceProofUrl) {
        return false;
      }
      return true;
    }
    case 4:
      if (!input.details.name || !input.details.email || !input.details.phone || !input.details.dob) {
        return false;
      }
      if (!isCustomerAtLeast18(input.details.dob)) return false;
      return isValidEmailFormat(input.details.email);
    case 5:
      return !!input.idDocumentUrl && !input.uploadingId;
    case 6:
      return (
        input.agreementFieldIds.every((id) => input.agreementSignatures[id]) && !!input.signedName
      );
    case 7:
      return true;
    default:
      return false;
  }
}
