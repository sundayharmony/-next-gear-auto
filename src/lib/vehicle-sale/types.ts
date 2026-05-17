export interface VehicleSaleRecord {
  id: string;
  vehicleId: string;
  saleDate: string;
  salePrice: number;
  buyerName: string;
  buyerAddress: string;
  buyerPhone: string | null;
  buyerEmail: string | null;
  odometer: number | null;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: string;
}

export interface SellVehicleRequestBody {
  buyerName: string;
  buyerAddress: string;
  buyerPhone?: string;
  buyerEmail?: string;
  saleDate: string;
  salePrice: number;
  odometer?: number;
  paymentMethod?: string;
  notes?: string;
}
