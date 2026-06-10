"use client";

import Link from "next/link";
import {
  Car,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Wrench,
  ImageIcon,
  Fuel,
  Loader2,
  EyeOff,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Vehicle, getVehicleDisplayName } from "@/lib/types";
import { getStaffVehicleDetailsHref } from "@/lib/admin/staff-vehicle-links";

const COLOR_HEX_MAP: Record<string, string> = {
  White: "#FFFFFF",
  Black: "#000000",
  Silver: "#C0C0C0",
  Gray: "#808080",
  Grey: "#808080",
  Blue: "#3B82F6",
  Red: "#EF4444",
  Green: "#22C55E",
  Yellow: "#EAB308",
  Orange: "#F97316",
  Brown: "#92400E",
  Beige: "#D4C5A9",
  Gold: "#CA8A04",
  Navy: "#1E3A5F",
  Maroon: "#7F1D1D",
  Purple: "#9333EA",
};

export interface VehicleListProps {
  vehicles: Vehicle[];
  filteredVehicles: Vehicle[];
  loading: boolean;
  pathname: string;
  editingId: string | null;
  togglingId: string | null;
  deletingId: string | null;
  saving: boolean;
  searchQuery: string;
  filterCategory: string;
  onClearFilters: () => void;
  onShowAddForm: () => void;
  onStartEdit: (vehicle: Vehicle) => void;
  onCancelEdit: () => void;
  onToggleAvailability: (vehicle: Vehicle) => void;
  onDelete: (id: string) => void;
}

export function VehicleList({
  vehicles,
  filteredVehicles,
  loading,
  pathname,
  editingId,
  togglingId,
  deletingId,
  saving,
  searchQuery,
  filterCategory,
  onClearFilters,
  onShowAddForm,
  onStartEdit,
  onCancelEdit,
  onToggleAvailability,
  onDelete,
}: VehicleListProps) {
  return (
    <>
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 text-purple-500 animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Loading vehicles...</p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="text-center py-12">
            <Car className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-3">
              {vehicles.length === 0
                ? "No vehicles yet. Add your first vehicle!"
                : "No vehicles match your search."}
            </p>
            {vehicles.length === 0 && (
              <Button
                onClick={() => {
                  onShowAddForm();
                  onCancelEdit();
                }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Your First Vehicle
              </Button>
            )}
            {vehicles.length > 0 && (searchQuery || filterCategory) && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  onClearFilters();
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredVehicles.map((vehicle) => (
              <Card key={vehicle.id} className={`overflow-hidden hover:shadow-lg transition-shadow ${editingId === vehicle.id ? "ring-2 ring-purple-500 ring-offset-2" : ""}`}>
                {/* Image */}
                <div className="relative h-48 bg-gray-100 overflow-hidden">
                  {vehicle.images && vehicle.images.length > 0 ? (
                    <img
                      src={vehicle.images[0]}
                      alt={getVehicleDisplayName(vehicle)}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext x='50' y='50' font-size='12' fill='%23999' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                      <Car className="h-16 w-16 text-gray-400" />
                    </div>
                  )}

                  {/* Status Badges Overlay */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    {vehicle.isPublished === false && (
                      <Badge className="bg-yellow-500 text-black flex items-center gap-1">
                        <EyeOff className="h-3 w-3" /> Draft
                      </Badge>
                    )}
                    <Badge
                      className={
                        vehicle.isAvailable
                          ? "bg-green-500"
                          : "bg-red-500"
                      }
                    >
                      {vehicle.isAvailable ? "Available" : "Unavailable"}
                    </Badge>
                  </div>

                  {/* Image count badge */}
                  {vehicle.images && vehicle.images.length > 1 && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 text-white text-xs font-medium rounded px-1.5 py-0.5">
                      <ImageIcon className="h-3 w-3" />
                      {vehicle.images.length}
                    </div>
                  )}
                </div>

                {/* Content */}
                <CardContent className="p-4">
                  {/* Title */}
                  <h3 className="font-semibold text-gray-900 mb-2 text-lg truncate" title={getVehicleDisplayName(vehicle)}>
                    <Link
                      href={getStaffVehicleDetailsHref(vehicle.id, pathname)}
                      className="hover:text-purple-700 hover:underline"
                    >
                      {getVehicleDisplayName(vehicle)}
                    </Link>
                  </h3>

                  {/* Description snippet */}
                  {vehicle.description && (
                    <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                      {vehicle.description}
                    </p>
                  )}

                  {/* Category and Color */}
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="capitalize">{vehicle.category}</Badge>
                    <div
                      className="w-4 h-4 rounded-full border border-gray-300"
                      aria-hidden="true"
                      style={{
                        backgroundColor: COLOR_HEX_MAP[vehicle.color] || "#666666",
                      }}
                      title={vehicle.color}
                    />
                    <span className="text-xs text-gray-600">{vehicle.color}</span>
                  </div>

                  {/* Pricing */}
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <div className="text-lg font-bold text-purple-600">
                        ${vehicle.dailyRate}
                      </div>
                      <div className="text-xs text-gray-600">Daily Rate</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-gray-700">
                        ${(vehicle.purchasePrice ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">
                        {vehicle.isFinanced ? (
                          <span className="text-purple-600 font-medium">
                            Financed Â· ${(vehicle.monthlyPayment ?? 0).toLocaleString()}/mo
                          </span>
                        ) : (
                          "Purchase Price"
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mileage and Specs */}
                  <div className="space-y-1 mb-3 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Mileage:</span>
                      <span className="font-medium">
                        {(vehicle.mileage ?? 0).toLocaleString()} miles
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Passengers:</span>
                      <span className="font-medium">
                        {vehicle.specs?.passengers ?? "â€”"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transmission:</span>
                      <span className="font-medium">
                        {vehicle.specs?.transmission ?? "â€”"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fuel:</span>
                      <span className="font-medium flex items-center gap-1">
                        <Fuel className="h-3 w-3" aria-hidden="true" />
                        {vehicle.specs?.fuelType ?? "â€”"}
                      </span>
                    </div>
                  </div>

                  {/* Maintenance Status */}
                  <div className="mb-4 flex items-center gap-2">
                    <Wrench className="h-3 w-3 text-gray-600" aria-hidden="true" />
                    <Badge
                      variant="outline"
                      className={
                        vehicle.maintenanceStatus === "good"
                          ? "text-green-600 border-green-300 bg-green-50"
                          : vehicle.maintenanceStatus === "needs-service"
                          ? "text-yellow-600 border-yellow-300 bg-yellow-50"
                          : "text-red-600 border-red-300 bg-red-50"
                      }
                    >
                      {vehicle.maintenanceStatus === "good"
                        ? "Good"
                        : vehicle.maintenanceStatus === "needs-service"
                        ? "Needs Service"
                        : "In Maintenance"}
                    </Badge>
                  </div>

                  {/* Features Tags */}
                  {vehicle.features && vehicle.features.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-1">
                      {vehicle.features.slice(0, 3).map((feature, idx) => (
                        <Badge
                          key={`${feature}-${idx}`}
                          variant="secondary"
                          className="text-xs"
                        >
                          {feature}
                        </Badge>
                      ))}
                      {vehicle.features.length > 3 && (
                        <Badge
                          variant="secondary"
                          className="text-xs"
                        >
                          +{vehicle.features.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* License Plate and VIN */}
                  <div className="mb-4 text-xs text-gray-500 space-y-1">
                    <div>
                      <span className="font-medium">License Plate:</span>{" "}
                      {vehicle.licensePlate || "â€”"}
                    </div>
                    <div title={vehicle.vin || undefined} className="break-all">
                      <span className="font-medium">VIN:</span>{" "}
                      {vehicle.vin || "â€”"}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link href={getStaffVehicleDetailsHref(vehicle.id, pathname)} className="flex-1">
                      <Button size="sm" type="button" variant="outline" className="w-full">
                        View
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant={editingId === vehicle.id ? "default" : "outline"}
                      className={`flex-1 ${editingId === vehicle.id ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}`}
                      onClick={() => editingId === vehicle.id ? onCancelEdit() : onStartEdit(vehicle)}
                    >
                      <Pencil className="h-3 w-3 mr-1" /> {editingId === vehicle.id ? "Editing" : "Edit"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onToggleAvailability(vehicle)}
                      disabled={togglingId === vehicle.id || saving || deletingId !== null}
                      className={`flex-1 ${
                        vehicle.isAvailable
                          ? "text-red-600 hover:text-red-700 hover:border-red-300"
                          : "text-green-600 hover:text-green-700 hover:border-green-300"
                      }`}
                    >
                      {togglingId === vehicle.id ? (
                        <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Updating...</>
                      ) : vehicle.isAvailable ? (
                        <><X className="h-3 w-3 mr-1" /> Unavailable</>
                      ) : (
                        <><Check className="h-3 w-3 mr-1" /> Available</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => onDelete(vehicle.id)}
                      disabled={deletingId === vehicle.id || saving}
                      aria-label={`Delete ${getVehicleDisplayName(vehicle)}`}
                    >
                      {deletingId === vehicle.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </>
  );
}
