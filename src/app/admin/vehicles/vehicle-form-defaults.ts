import { Vehicle, VehicleCategory } from "@/lib/types";

export const CATEGORIES: VehicleCategory[] = [
  "compact",
  "sedan",
  "suv",
  "truck",
  "luxury",
  "van",
];

const CURRENT_YEAR = new Date().getFullYear();
export const MAX_VEHICLE_YEAR = CURRENT_YEAR + 1;
export const TRANSMISSION_OPTIONS = ["Automatic", "Manual"] as const;
export const FUEL_TYPE_OPTIONS = ["Gasoline", "Diesel", "Hybrid", "Electric"] as const;

export const emptyVehicle: Omit<Vehicle, "id"> = {
  year: CURRENT_YEAR,
  make: "",
  model: "",
  category: "sedan",
  images: [],
  specs: {
    passengers: 5,
    luggage: 2,
    transmission: "Automatic",
    fuelType: "Gasoline",
    mpg: 30,
    doors: 4,
  },
  dailyRate: 0,
  purchasePrice: 0,
  features: [],
  isAvailable: true,
  isPublished: true,
  description: "",
  color: "White",
  mileage: 0,
  licensePlate: "",
  vin: "",
  insuranceCardUrls: [],
  maintenanceStatus: "good",
  isFinanced: false,
  monthlyPayment: 0,
  paymentDayOfMonth: 1,
  financingStartDate: "",
};

export interface VehicleFormState extends Omit<Vehicle, "id"> {
  featureInput?: string;
}
