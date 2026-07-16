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
import { AdminStatusBanner, AdminEmptyState } from "@/components/admin/ui-feedback";
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
            <Button variant="outline" size="sm" className="page-hero-btn-outline gap-1">
              <ArrowLeft className="h-4 w-4" />
              Calendar
            </Button>
          </Link>
        }
      />
      <AdminPageBody>
        {toastError && (
          <AdminStatusBanner type="error" message={toastError} onDismiss={() => setToastError(null)} />
        )}
        {toastSuccess && (
          <AdminStatusBanner type="success" message={toastSuccess} onDismiss={() => setToastSuccess(null)} />
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
          <AdminEmptyState
            title="No vehicles assigned"
            description="Contact admin to assign vehicles before creating bookings."
          />
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
