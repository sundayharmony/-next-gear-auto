import { getVehicleDisplayName } from "@/lib/types";

type SupabaseLike = {
  from: (table: string) => {
    select: (...args: unknown[]) => any;
    eq: (...args: unknown[]) => any;
    order: (...args: unknown[]) => any;
    limit: (...args: unknown[]) => any;
    maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
    not: (...args: unknown[]) => any;
    gte: (...args: unknown[]) => any;
    lte: (...args: unknown[]) => any;
    range: (...args: unknown[]) => Promise<{ data: unknown; error: unknown; count?: number | null }>;
  };
};

export type StaffRole = "admin" | "manager";

export interface VehicleDetailsDto {
  id: string;
  year: number;
  make: string;
  model: string;
  displayName: string;
  category: string | null;
  images: string[];
  specs: Record<string, unknown>;
  dailyRate: number;
  features: string[];
  isAvailable: boolean;
  isPublished: boolean;
  description: string;
  color: string;
  mileage: number;
  licensePlate: string;
  vin: string;
  maintenanceStatus: string;
  createdAt: string | null;
  purchasePrice?: number;
  isFinanced?: boolean;
  monthlyPayment?: number;
  paymentDayOfMonth?: number;
  financingStartDate?: string | null;
}

function mapVehicle(vehicle: Record<string, unknown>, role: StaffRole): VehicleDetailsDto {
  const mapped: VehicleDetailsDto = {
    id: String(vehicle.id || ""),
    year: Number(vehicle.year || 0),
    make: String(vehicle.make || ""),
    model: String(vehicle.model || ""),
    displayName: getVehicleDisplayName({
      year: vehicle.year as number | string | undefined,
      make: vehicle.make as string | undefined,
      model: vehicle.model as string | undefined,
    }),
    category: (vehicle.category as string | null) ?? null,
    images: (vehicle.images as string[]) || [],
    specs: (vehicle.specs as Record<string, unknown>) || {},
    dailyRate: Number(vehicle.daily_rate || 0),
    features: (vehicle.features as string[]) || [],
    isAvailable: vehicle.is_available !== false,
    isPublished: vehicle.is_published !== false,
    description: String(vehicle.description || ""),
    color: String(vehicle.color || ""),
    mileage: Number(vehicle.mileage || 0),
    licensePlate: String(vehicle.license_plate || ""),
    vin: String(vehicle.vin || ""),
    maintenanceStatus: String(vehicle.maintenance_status || "good"),
    createdAt: (vehicle.created_at as string | null) ?? null,
  };

  if (role === "admin") {
    mapped.purchasePrice = Number(vehicle.purchase_price || 0);
    mapped.isFinanced = Boolean(vehicle.is_financed);
    mapped.monthlyPayment = Number(vehicle.monthly_payment || 0);
    mapped.paymentDayOfMonth = Number(vehicle.payment_day_of_month || 1);
    mapped.financingStartDate = (vehicle.financing_start_date as string | null) ?? null;
  }

  return mapped;
}

export async function fetchVehicleById(
  supabase: SupabaseLike,
  vehicleId: string,
  role: StaffRole
): Promise<VehicleDetailsDto | null> {
  const { data, error } = await supabase
    .from("vehicles")
    .select(
      "id, year, make, model, category, daily_rate, images, is_available, features, specs, mileage, license_plate, vin, maintenance_status, description, color, purchase_price, is_financed, monthly_payment, payment_day_of_month, financing_start_date, is_published, created_at"
    )
    .eq("id", vehicleId)
    .maybeSingle();

  if (error || !data) return null;
  return mapVehicle(data as unknown as Record<string, unknown>, role);
}

export interface VehicleBookingQuery {
  status?: string | null;
  from?: string | null;
  to?: string | null;
  page?: number;
  limit?: number;
}

export async function fetchBookingsByVehicle(
  supabase: SupabaseLike,
  vehicleId: string,
  role: StaffRole,
  userId: string,
  query: VehicleBookingQuery
) {
  const status = query.status && query.status !== "all" ? query.status : null;
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 25));
  const offset = (page - 1) * limit;
  const today = new Date().toISOString().slice(0, 10);

  let dbQuery = supabase
    .from("bookings")
    .select("*, vehicles(year, make, model)", { count: "exact" })
    .eq("vehicle_id", vehicleId)
    .order("pickup_date", { ascending: false });

  if (role === "manager") {
    dbQuery = dbQuery.not("status", "in", "(cancelled,completed)").gte("return_date", today);
  }
  if (status) dbQuery = dbQuery.eq("status", status);
  if (query.from) dbQuery = dbQuery.gte("pickup_date", query.from);
  if (query.to) dbQuery = dbQuery.lte("return_date", query.to);

  const { data, error, count } = await dbQuery.range(offset, offset + limit - 1);
  if (error) return { data: [], total: 0, page, limit };

  const rows = (data || []).map((b: Record<string, unknown>) => {
    const v = b.vehicles as { year?: number; make?: string; model?: string } | null;
    const canViewPricing = role === "admin" || b.created_by_user_id === userId;
    const total_price = canViewPricing ? b.total_price : null;
    const deposit = canViewPricing ? b.deposit : null;
    return {
      ...b,
      total_price,
      deposit,
      canViewPricing,
      canManage: role === "admin" || b.created_by_user_id === userId,
      vehicleName: v ? getVehicleDisplayName(v) : "Unknown Vehicle",
      customerName: b.customer_name || "Guest",
    };
  });

  return { data: rows, total: count || 0, page, limit };
}

export async function fetchVehicleSummary(
  supabase: SupabaseLike,
  vehicleId: string,
  role: StaffRole
) {
  const [blocked, maintenance, tickets, expenses, reviews] = await Promise.all([
    supabase
      .from("blocked_dates")
      .select("id, start_date, end_date, source, reason", { count: "exact" })
      .eq("vehicle_id", vehicleId)
      .order("start_date", { ascending: false })
      .limit(3),
    supabase
      .from("maintenance_records")
      .select("id, title, status, scheduled_date, created_at", { count: "exact" })
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("tickets")
      .select("id, ticket_type, amount_due, status, violation_date, created_at", { count: "exact" })
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false })
      .limit(3),
    role === "admin"
      ? supabase
          .from("expenses")
          .select("id, category, amount, date, description, created_at", { count: "exact" })
          .eq("vehicle_id", vehicleId)
          .order("date", { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [], count: 0, error: null }),
    supabase
      .from("reviews")
      .select("id, customer_name, rating, status, created_at", { count: "exact" })
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const reviewsAvg = ((reviews.data as Array<{ rating?: number }>) || []).reduce(
    (sum, r) => sum + Number(r.rating || 0),
    0
  );
  const reviewsCount = reviews.count || 0;

  return {
    counts: {
      blockedDates: blocked.count || 0,
      maintenance: maintenance.count || 0,
      tickets: tickets.count || 0,
      expenses: role === "admin" ? expenses.count || 0 : 0,
      reviews: reviewsCount,
    },
    latest: {
      blockedDates: blocked.data || [],
      maintenance: maintenance.data || [],
      tickets: tickets.data || [],
      expenses: role === "admin" ? (expenses.data || []) : [],
      reviews: reviews.data || [],
    },
    reviews: {
      average: reviewsCount > 0 ? reviewsAvg / reviewsCount : 0,
      total: reviewsCount,
    },
  };
}

