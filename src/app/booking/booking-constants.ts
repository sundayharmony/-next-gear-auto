import {
  Search, Car, Package, UserCheck, ShieldCheck, FileText, CreditCard,
} from "lucide-react";
import { formatTime } from "@/lib/utils/date-helpers";

export const WIZARD_STEPS = [
  { num: 1, label: "Search", icon: Search },
  { num: 2, label: "Vehicle", icon: Car },
  { num: 3, label: "Extras", icon: Package },
  { num: 4, label: "Details", icon: UserCheck },
  { num: 5, label: "Verify", icon: ShieldCheck },
  { num: 6, label: "Review", icon: FileText },
  { num: 7, label: "Payment", icon: CreditCard },
] as const;

const formatTime24To12 = formatTime;

function generateTimeOptions() {
  const options: { value: string; display: string }[] = [];
  for (let hour = 8; hour <= 18; hour++) {
    for (const minute of [0, 30]) {
      const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      options.push({ value: timeStr, display: formatTime24To12(timeStr) });
    }
  }
  return options;
}

export const TIME_OPTIONS = generateTimeOptions();

export type BookingLocation = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat?: number;
  lng?: number;
  surcharge: number;
  is_default: boolean;
};
