export interface TicketRecord {
  id: string;
  bookingId: string | null;
  customerId: string | null;
  vehicleId: string | null;
  licensePlate: string;
  ticketType: "traffic" | "parking";
  violationDate: string;
  state: string;
  municipality: string;
  courtId: string;
  prefix: string;
  ticketNumber: string;
  amountDue: number;
  status: "unpaid" | "paid" | "disputed" | "dismissed";
  notes: string;
  createdAt: string;
  vehicleName: string;
  customerName: string;
  bookingDates: string;
}

export const STATUS_COLORS: Record<string, string> = {
  unpaid: "bg-red-100 text-red-700 border-red-200",
  paid: "bg-green-100 text-green-700 border-green-200",
  disputed: "bg-amber-100 text-amber-700 border-amber-200",
  dismissed: "bg-gray-100 text-gray-600 border-gray-200",
};

export const TYPE_COLORS: Record<string, string> = {
  traffic: "bg-blue-100 text-blue-700",
  parking: "bg-purple-100 text-purple-700",
};
