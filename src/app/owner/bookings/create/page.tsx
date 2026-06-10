"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  AdminPageHeader,
  AdminPageBody,
  AdminCard,
} from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { useOwnerData } from "@/lib/owner/owner-data-context";
import { OwnerCreateBookingForm } from "@/components/owner/OwnerCreateBookingForm";

export default function OwnerCreateBookingPage() {
  const router = useRouter();
  const { vehicles, loading, error, reload } = useOwnerData();
  const [toastError, setToastError] = React.useState<string | null>(null);
  const [toastSuccess, setToastSuccess] = React.useState<string | null>(null);

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

        {loading && vehicles.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" role="status" aria-label="Loading vehicles" />
          </div>
        ) : error ? (
          <AdminCard>
            <p className="py-6 text-center text-sm text-red-600">{error}</p>
          </AdminCard>
        ) : vehicles.length === 0 ? (
          <AdminCard>
            <p className="py-6 text-center text-sm text-gray-500">
              No vehicles are assigned to your owner account yet. Contact admin to assign vehicles before creating bookings.
            </p>
          </AdminCard>
        ) : (
          <OwnerCreateBookingForm
            vehicles={vehicles}
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
