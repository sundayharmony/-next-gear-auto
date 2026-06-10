export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  vehicleName?: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed";
  cost: number | null;
  photoUrls: string[];
  startedDate: string;
  completedDate: string;
  notes: string;
  createdAt: string;
}

export const emptyRecord: Omit<MaintenanceRecord, "id" | "createdAt"> = {
  vehicleId: "",
  vehicleName: "",
  title: "",
  description: "",
  status: "pending",
  cost: null,
  photoUrls: [],
  startedDate: "",
  completedDate: "",
  notes: "",
};

export interface FormState extends Omit<MaintenanceRecord, "id" | "createdAt"> {}
