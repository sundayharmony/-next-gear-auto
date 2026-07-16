"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarDays, Car, Wrench, Ticket, DollarSign, Star, FileText } from "lucide-react";
import { SellVehicleDialog, type VehicleSaleSummary } from "@/app/admin/vehicles/details/SellVehicleDialog";
import {
  AdminPageHeader,
  AdminPageBody,
  AdminCard,
  AdminSection,
  AdminStatCard,
  adminListItemClass,
} from "@/components/admin/admin-shell";
import { AdminEmptyState } from "@/components/admin/ui-feedback";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { formatDate } from "@/lib/utils/date-helpers";
import { getStaffVehicleDetailsHref } from "@/lib/admin/staff-vehicle-links";
import {
  adminPanelConfig,
  type StaffPanelConfig,
} from "@/lib/admin/staff-panel-config";
import { cn } from "@/lib/utils/cn";

interface VehicleDetails {
  id: string;
  displayName: string;
  year: number;
  make: string;
  model: string;
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
}

interface SummaryResponse {
  counts: {
    bookingsAndTuro: number;
    manualBlocks: number;
    maintenance: number;
    tickets: number;
    expenses: number;
    reviews: number;
  };
  reviews: {
    average: number;
    total: number;
  };
}

interface VehicleBookingsResponse {
  data: Array<{
    id: string;
    kind?: "booking" | "turo";
    customer_name: string;
    pickup_date: string;
    return_date: string;
    total_price: number | null;
    earnings?: number | null;
    status: string;
    canViewPricing?: boolean;
  }>;
  total: number;
  page: number;
  limit: number;
}

export function SharedVehicleDetailsPage({
  panelConfig = adminPanelConfig,
}: {
  panelConfig?: StaffPanelConfig;
} = {}) {
  const params = useParams<{ id: string }>();
  const vehicleId = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<VehicleDetails | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [bookings, setBookings] = useState<VehicleBookingsResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const panelBase = panelConfig.panelBase;
  const isAdminPanel = panelConfig.panelMode === "admin";
  const backHref = `${panelBase}/vehicles`;

  const [sale, setSale] = useState<VehicleSaleSummary | null>(null);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);

  useEffect(() => {
    if (!vehicleId) return;
    let active = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [vehicleRes, summaryRes, bookingsRes] = await Promise.all([
          adminFetch(`/api/admin/vehicles/${encodeURIComponent(vehicleId)}`),
          adminFetch(`/api/admin/vehicles/${encodeURIComponent(vehicleId)}/summary`),
          adminFetch(
            `/api/admin/vehicles/${encodeURIComponent(vehicleId)}/bookings?status=${encodeURIComponent(
              statusFilter
            )}&page=${page}&limit=25`
          ),
        ]);

        const [vehicleJson, summaryJson, bookingsJson] = await Promise.all([
          vehicleRes.json(),
          summaryRes.json(),
          bookingsRes.json(),
        ]);

        if (!active) return;
        if (!vehicleRes.ok || !vehicleJson?.success) {
          throw new Error(vehicleJson?.message || "Failed to load vehicle");
        }
        setVehicle(vehicleJson.data);
        setSummary(summaryJson?.data || null);
        setBookings(bookingsJson?.success ? bookingsJson : null);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load vehicle details");
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [vehicleId, statusFilter, page]);

  useEffect(() => {
    if (!vehicleId || !isAdminPanel) {
      setSale(null);
      return;
    }
    let active = true;
    (async () => {
      try {
        const res = await adminFetch(`/api/admin/vehicles/${encodeURIComponent(vehicleId)}/sell`);
        const json = await res.json();
        if (!active) return;
        if (res.ok && json.success && json.data) {
          setSale(json.data as VehicleSaleSummary);
        } else {
          setSale(null);
        }
      } catch {
        if (active) setSale(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [vehicleId, isAdminPanel, vehicle?.isPublished, vehicle?.isAvailable]);

  const statusFilters = useMemo(
    () => ["all", "pending", "confirmed", "active", "completed", "cancelled"],
    []
  );

  if (loading) {
    return (
      <>
        <AdminPageHeader title="Vehicle details" backHref={backHref} backLabel="Back to Vehicles" />
        <AdminPageBody>
          <p className="text-gray-500">Loading vehicle details...</p>
        </AdminPageBody>
      </>
    );
  }

  if (error || !vehicle) {
    return (
      <>
        <AdminPageHeader title="Vehicle details" backHref={backHref} backLabel="Back to Vehicles" />
        <AdminPageBody>
          <AdminCard>
            <p className="text-red-600">{error || "Vehicle not found"}</p>
          </AdminCard>
        </AdminPageBody>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title={vehicle.displayName}
        subtitle={vehicle.category || "Uncategorized"}
        backHref={backHref}
        backLabel="Back to Vehicles"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {sale ? (
              <Badge className="bg-slate-800 text-white">Sold {formatDate(sale.saleDate)}</Badge>
            ) : null}
            <Badge className={vehicle.isAvailable ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"}>
              {vehicle.isAvailable ? "Available" : "Unavailable"}
            </Badge>
            <Badge className={vehicle.isPublished ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}>
              {vehicle.isPublished ? "Published" : "Draft"}
            </Badge>
            {isAdminPanel && !sale ? (
              <Button type="button" size="sm" className="page-hero-btn-outline" onClick={() => setSellDialogOpen(true)}>
                Sell vehicle
              </Button>
            ) : null}
            {isAdminPanel && sale ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="page-hero-btn-outline"
                onClick={async () => {
                  if (!vehicleId) return;
                  const res = await adminFetch(
                    `/api/admin/vehicles/${encodeURIComponent(vehicleId)}/sell`,
                  );
                  const json = await res.json();
                  const url = json?.data?.pdfDownloadUrl as string | undefined;
                  if (url) {
                    setSale((s) => (s ? { ...s, pdfDownloadUrl: url } : s));
                    window.open(url, "_blank", "noopener,noreferrer");
                  }
                }}
              >
                <FileText className="h-3.5 w-3.5 mr-1" />
                Bill of sale
              </Button>
            ) : null}
          </div>
        }
      />
      <AdminPageBody>
        <AdminCard>
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><span className="text-gray-500">Daily rate:</span> ${vehicle.dailyRate.toFixed(2)}</div>
            <div><span className="text-gray-500">Mileage:</span> {vehicle.mileage.toLocaleString()}</div>
            <div><span className="text-gray-500">Plate:</span> {vehicle.licensePlate || "—"}</div>
            <div><span className="text-gray-500">VIN:</span> {vehicle.vin || "—"}</div>
          </div>
          {vehicle.description ? <p className="mt-4 text-sm text-gray-700">{vehicle.description}</p> : null}
        </AdminCard>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
          <AdminStatCard label="Bookings" value={summary?.counts.bookingsAndTuro ?? bookings?.total ?? 0} icon={CalendarDays} />
          <AdminStatCard label="Manual blocks" value={summary?.counts.manualBlocks ?? 0} icon={Car} />
          <AdminStatCard label="Maintenance" value={summary?.counts.maintenance ?? 0} icon={Wrench} />
          <AdminStatCard label="Tickets" value={summary?.counts.tickets ?? 0} icon={Ticket} />
          <AdminStatCard label="Reviews" value={summary?.reviews.total ?? 0} icon={Star} />
        </div>

        <AdminSection
          title="Booking History"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {statusFilters.map((s) => (
                <Button
                  key={s}
                  type="button"
                  size="sm"
                  variant={statusFilter === s ? "default" : "outline"}
                  aria-pressed={statusFilter === s}
                  onClick={() => {
                    setStatusFilter(s);
                    setPage(1);
                  }}
                  className="capitalize"
                >
                  {s}
                </Button>
              ))}
            </div>
          }
        >
          <AdminCard>
            <div className="space-y-2">
              {(bookings?.data || []).map((b) => {
                const isTuro = b.kind === "turo";
                const canPrice = b.canViewPricing !== false;
                const amount =
                  typeof b.total_price === "number"
                    ? b.total_price
                    : isTuro && typeof b.earnings === "number" && b.earnings > 0
                      ? b.earnings
                      : null;
                const priceLabel =
                  amount !== null && amount >= 0 && canPrice ? `$${amount.toFixed(2)}` : "Hidden";
                return (
                  <div key={b.id} className={cn(adminListItemClass, "flex flex-wrap items-center justify-between gap-2")}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={isTuro ? "bg-teal-100 text-teal-800" : "bg-gray-100 text-gray-700"}>
                        {isTuro ? "Turo" : "Reservation"}
                      </Badge>
                      <div>
                        <p className="font-medium text-gray-900">{b.customer_name || "Guest"}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(b.pickup_date)} {"->"} {formatDate(b.return_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{b.status || "unknown"}</Badge>
                      <span className="text-sm font-semibold text-gray-800">{priceLabel}</span>
                    </div>
                  </div>
                );
              })}
              {bookings?.data?.length === 0 ? (
                <AdminEmptyState title="No bookings found for this filter." />
              ) : null}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Page {bookings?.page || 1} of {Math.max(1, Math.ceil((bookings?.total || 0) / (bookings?.limit || 25)))}
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={(bookings?.page || 1) >= Math.ceil((bookings?.total || 0) / (bookings?.limit || 25))}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </AdminCard>
        </AdminSection>

        <AdminSection title="Quick Links">
          <AdminCard padding="sm">
            <div className="flex flex-wrap gap-2">
              <Link href={`${panelBase}/bookings?vehicle_id=${encodeURIComponent(vehicle.id)}`}>
                <Button type="button" size="sm" variant="outline">All bookings for vehicle</Button>
              </Link>
              <Link href={`${panelBase}/maintenance?vehicle_id=${encodeURIComponent(vehicle.id)}`}>
                <Button type="button" size="sm" variant="outline">Maintenance records</Button>
              </Link>
              <Link href={getStaffVehicleDetailsHref(vehicle.id, panelBase)}>
                <Button type="button" size="sm" variant="outline">
                  <DollarSign className="h-3.5 w-3.5 mr-1" />
                  Refresh details
                </Button>
              </Link>
            </div>
          </AdminCard>
        </AdminSection>

        {isAdminPanel && vehicleId ? (
          <SellVehicleDialog
            vehicleId={vehicleId}
            vehicleMileage={vehicle.mileage}
            open={sellDialogOpen}
            onClose={() => setSellDialogOpen(false)}
            onSold={(sold) => {
              setSale(sold);
              setVehicle((v) =>
                v
                  ? { ...v, isAvailable: false, isPublished: false }
                  : v,
              );
            }}
          />
        ) : null}
      </AdminPageBody>
    </>
  );
}

