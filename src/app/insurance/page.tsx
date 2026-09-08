import { getServiceSupabase } from "@/lib/db/supabase";
import { SITE_NAME, CONTACT_INFO } from "@/lib/constants";
import type { Metadata } from "next";
import { InsuranceCardGallery } from "./insurance-card-gallery";

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
  insuranceCardUrls: string[];
}

async function fetchInsuranceVehicles(): Promise<InsuranceVehicle[]> {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("vehicles")
    .select("id, year, make, model, vin, category, color, mileage, insurance_card_urls")
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
    insuranceCardUrls: (v.insurance_card_urls as string[]) || [],
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

        {/* Vehicle Cards */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Vehicle Inventory
            </h2>
            <p className="text-sm text-gray-500">
              All currently available vehicles in our fleet
            </p>
          </div>

          {vehicles.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
              No vehicles currently available.
            </div>
          ) : (
            vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* Vehicle Info */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h3>
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 block">VIN</span>
                          <code className="font-mono text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-xs">
                            {vehicle.vin || "N/A"}
                          </code>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Category</span>
                          <span className="text-gray-900">
                            {formatCategory(vehicle.category)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Color</span>
                          <span className="text-gray-900 capitalize">
                            {vehicle.color || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Mileage</span>
                          <span className="text-gray-900">
                            {formatMileage(vehicle.mileage)} mi
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Insurance Card */}
                    <div className="lg:w-64">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">
                        Insurance Card
                      </span>
                      {vehicle.insuranceCardUrls.length > 0 ? (
                        <InsuranceCardGallery
                          images={vehicle.insuranceCardUrls}
                          vehicleName={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                        />
                      ) : (
                        <div className="text-sm text-gray-400 italic">
                          No insurance card uploaded
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
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
