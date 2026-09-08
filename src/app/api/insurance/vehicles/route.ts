import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";

export interface InsuranceVehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  vin: string | null;
  category: string;
  color: string;
  mileage: number;
}

const INSURANCE_VEHICLE_SELECT =
  "id, year, make, model, vin, category, color, mileage";

export async function GET() {
  try {
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from("vehicles")
      .select(INSURANCE_VEHICLE_SELECT)
      .eq("is_available", true)
      .order("year", { ascending: false })
      .order("make", { ascending: true })
      .order("model", { ascending: true });

    if (error) {
      console.error("Insurance vehicles fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch vehicles" },
        { status: 500 }
      );
    }

    const vehicles: InsuranceVehicle[] = (data || []).map((v) => ({
      id: String(v.id),
      year: Number(v.year) || 0,
      make: String(v.make || ""),
      model: String(v.model || ""),
      vin: v.vin ? String(v.vin) : null,
      category: String(v.category || ""),
      color: String(v.color || ""),
      mileage: Number(v.mileage ?? 0),
    }));

    return NextResponse.json({ vehicles });
  } catch (err) {
    console.error("Insurance vehicles error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
