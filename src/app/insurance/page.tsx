import { getServiceSupabase } from "@/lib/db/supabase";
import { SITE_NAME, CONTACT_INFO } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Fleet Insurance Information | ${SITE_NAME}`,
  description: "Vehicle information for insurance purposes",
  robots: "noindex, nofollow",
};

interface InsuranceVehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  vin: string | null;
  category: string;
  color: string;
  mileage: number;
}

async function fetchInsuranceVehicles(): Promise<InsuranceVehicle[]> {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("vehicles")
    .select("id, year, make, model, vin, category, color, mileage")
    .eq("is_available", true)
    .order("year", { ascending: false })
    .order("make", { ascending: true })
    .order("model", { ascending: true });

  if (error) {
    console.error("Insurance vehicles fetch error:", error);
    return [];
  }

  return (data || []).map((v) => ({
    id: String(v.id),
    year: Number(v.year) || 0,
    make: String(v.make || ""),
    model: String(v.model || ""),
    vin: v.vin ? String(v.vin) : null,
    category: String(v.category || ""),
    color: String(v.color || ""),
    mileage: Number(v.mileage ?? 0),
  }));
}

function formatCategory(category: string): string {
  const categories: Record<string, string> = {
    compact: "Compact/Economy",
    sedan: "Sedan",
    suv: "SUV",
    truck: "Truck/Pickup",
    luxury: "Luxury",
    van: "Van",
  };
  return categories[category] || category;
}

function formatMileage(mileage: number): string {
  return mileage.toLocaleString();
}

export default async function InsurancePage() {
  const vehicles = await fetchInsuranceVehicles();
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{SITE_NAME}</h1>
              <p className="text-gray-600">Fleet Vehicle Information</p>
            </div>
            <div className="text-sm text-gray-500 text-right">
              <p>Generated: {today}</p>
              <p>{vehicles.length} Active Vehicles</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Address:</span>{" "}
              {CONTACT_INFO.address}, {CONTACT_INFO.city}, {CONTACT_INFO.state}{" "}
              {CONTACT_INFO.zip}
            </div>
            <div>
              <span className="font-medium">Phone:</span> {CONTACT_INFO.phone}
            </div>
            <div>
              <span className="font-medium">Email:</span> {CONTACT_INFO.email}
            </div>
          </div>
        </div>

        {/* Vehicle Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Vehicle Inventory
            </h2>
            <p className="text-sm text-gray-500">
              All currently available vehicles in our fleet
            </p>
          </div>

          {vehicles.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No vehicles currently available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vehicle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      VIN
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Color
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mileage
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">
                          {vehicle.vin || "N/A"}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatCategory(vehicle.category)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                        {vehicle.color || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                        {formatMileage(vehicle.mileage)} mi
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            This document is provided for insurance verification purposes only.
          </p>
          <p className="mt-1">
            For questions, contact us at {CONTACT_INFO.email} or{" "}
            {CONTACT_INFO.phone}
          </p>
        </div>
      </div>
    </div>
  );
}
