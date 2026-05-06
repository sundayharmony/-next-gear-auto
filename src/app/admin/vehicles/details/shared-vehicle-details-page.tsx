"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ArrowLeft, CalendarDays, Car, Wrench, Ticket, DollarSign, Star } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { formatDate } from "@/lib/utils/date-helpers";
import { getStaffVehicleDetailsHref } from "@/lib/admin/staff-vehicle-links";

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
    blockedDates: number;
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
    customer_name: string;
    pickup_date: string;
    return_date: string;
    total_price: number | null;
    status: string;
  }>;
  total: number;
  page: number;
  limit: number;
}

export function SharedVehicleDetailsPage() {
  const pathname = usePathname();
  const params = useParams<{ id: string }>();
  const vehicleId = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<VehicleDetails | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [bookings, setBookings] = useState<VehicleBookingsResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const panelBase = pathname.startsWith("/manager") ? "/manager" : "/admin";
  const backHref = `${panelBase}/vehicles`;

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

  const statusFilters = useMemo(
    () => ["all", "pending", "confirmed", "active", "completed", "cancelled"],
    []
  );

  if (loading) {
    return (
      <PageContainer className="py-10">
        <p className="text-gray-500">Loading vehicle details...</p>
      </PageContainer>
    );
  }

  if (error || !vehicle) {
    return (
      <PageContainer className="py-10 space-y-4">
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-purple-700 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Vehicles
        </Link>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">{error || "Vehicle not found"}</p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="py-6 space-y-6">
      <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-purple-700 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to Vehicles
      </Link>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{vehicle.displayName}</h1>
              <p className="text-sm text-gray-500 mt-1">{vehicle.category || "Uncategorized"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={vehicle.isAvailable ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"}>
                {vehicle.isAvailable ? "Available" : "Unavailable"}
              </Badge>
              <Badge className={vehicle.isPublished ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}>
                {vehicle.isPublished ? "Published" : "Draft"}
              </Badge>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div><span className="text-gray-500">Daily rate:</span> ${vehicle.dailyRate.toFixed(2)}</div>
            <div><span className="text-gray-500">Mileage:</span> {vehicle.mileage.toLocaleString()}</div>
            <div><span className="text-gray-500">Plate:</span> {vehicle.licensePlate || "—"}</div>
            <div><span className="text-gray-500">VIN:</span> {vehicle.vin || "—"}</div>
          </div>
          {vehicle.description ? <p className="mt-4 text-sm text-gray-700">{vehicle.description}</p> : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-purple-600" /><span className="text-sm">Bookings</span></div><p className="text-xl font-bold mt-1">{bookings?.total ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Car className="h-4 w-4 text-purple-600" /><span className="text-sm">Blocked dates</span></div><p className="text-xl font-bold mt-1">{summary?.counts.blockedDates ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Wrench className="h-4 w-4 text-purple-600" /><span className="text-sm">Maintenance</span></div><p className="text-xl font-bold mt-1">{summary?.counts.maintenance ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Ticket className="h-4 w-4 text-purple-600" /><span className="text-sm">Tickets</span></div><p className="text-xl font-bold mt-1">{summary?.counts.tickets ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Star className="h-4 w-4 text-purple-600" /><span className="text-sm">Reviews</span></div><p className="text-xl font-bold mt-1">{summary?.reviews.total ?? 0}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Booking History</h2>
            <div className="flex items-center gap-2">
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
          </div>

          <div className="mt-4 space-y-2">
            {(bookings?.data || []).map((b) => (
              <div key={b.id} className="rounded-lg border border-gray-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">{b.customer_name || "Guest"}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(b.pickup_date)} {"->"} {formatDate(b.return_date)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{b.status || "unknown"}</Badge>
                  <span className="text-sm font-semibold text-gray-800">
                    {typeof b.total_price === "number" ? `$${b.total_price.toFixed(2)}` : "Hidden"}
                  </span>
                </div>
              </div>
            ))}
            {bookings?.data?.length === 0 ? (
              <p className="text-sm text-gray-500">No bookings found for this filter.</p>
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Links</h2>
          <div className="flex flex-wrap gap-2">
            <Link href={`${panelBase}/bookings?vehicle_id=${encodeURIComponent(vehicle.id)}`}>
              <Button type="button" size="sm" variant="outline">All bookings for vehicle</Button>
            </Link>
            <Link href={`${panelBase}/maintenance?vehicle_id=${encodeURIComponent(vehicle.id)}`}>
              <Button type="button" size="sm" variant="outline">Maintenance records</Button>
            </Link>
            <Link href={getStaffVehicleDetailsHref(vehicle.id, pathname)}>
              <Button type="button" size="sm" variant="outline">
                <DollarSign className="h-3.5 w-3.5 mr-1" />
                Refresh details
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

