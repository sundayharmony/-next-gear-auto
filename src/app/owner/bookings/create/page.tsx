"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  AdminPageHeader,
  AdminPageBody,
  AdminCard,
} from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { useOwnerApi } from "@/lib/owner/use-owner-api";
import CreateBookingForm from "@/app/admin/bookings/components/CreateBookingForm";
import type { Vehicle } from "@/app/admin/bookings/types";
import type { OwnerVehicle } from "@/lib/types";

function toFormVehicles(vehicles: OwnerVehicle[]): Vehicle[] {
  return vehicles.map((v) => ({
    id: v.id,
    year: v.year,
    make: v.make,
    model: v.model,
    dailyRate: v.dailyRate,
    isAvailable: v.isAvailable,
  }));
}

export default function OwnerCreateBookingPage() {
  const router = useRouter();
  const { data: vehicles, loading, error, reload } = useOwnerApi<OwnerVehicle[]>("/api/owner/vehicles");
  const [toastError, setToastError] = useState<string | null>(null);
  const [toastSuccess, setToastSuccess] = useState<string | null>(null);

  const formVehicles = useMemo(() => toFormVehicles(vehicles || []), [vehicles]);

  return (
    <>
      <AdminPageHeader
        title="Create Booking"
        subtitle="Reserve one of your vehicles for a guest"
        actions={
          <Link href="/owner/calendar">
            <Button variant="outline" size="sm" className="gap-1 border-white/30 bg-white/10 text-white hover:bg-white/20">
              <ArrowLeft className="h-4 w-4" />
              Calendar
            </Button>
          </Link>
        }
      />
      <AdminPageBody>
        {toastError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {toastError}
          </div>
        )}
        {toastSuccess && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {toastSuccess}
          </div>
        )}

        {loading && !vehicles ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : error ? (
          <AdminCard>
            <p className="py-6 text-center text-sm text-red-600">{error}</p>
          </AdminCard>
        ) : formVehicles.length === 0 ? (
          <AdminCard>
            <p className="py-6 text-center text-sm text-gray-500">
              No vehicles are assigned to your owner account yet. Contact admin to assign vehicles before creating bookings.
            </p>
          </AdminCard>
        ) : (
          <CreateBookingForm
            variant="owner"
            createEndpoint="/api/owner/bookings"
            vehicles={formVehicles}
            allCustomers={[]}
            onClose={() => router.push("/owner/calendar")}
            onCreated={() => {
              reload();
              router.push("/owner/calendar");
            }}
            onError={(msg) => {
              setToastSuccess(null);
              setToastError(msg);
            }}
            onSuccess={(msg) => {
              setToastError(null);
              setToastSuccess(msg);
            }}
          />
        )}
      </AdminPageBody>
    </>
  );
}
