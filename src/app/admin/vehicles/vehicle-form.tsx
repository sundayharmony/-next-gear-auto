"use client";

import { Plus, Check, X, RefreshCw, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { VehicleImageManager } from "@/components/admin/vehicle-image-manager";
import { Vehicle, VehicleCategory } from "@/lib/types";

export const CATEGORIES: VehicleCategory[] = [
  "compact",
  "sedan",
  "suv",
  "truck",
  "luxury",
  "van",
];

const CURRENT_YEAR = new Date().getFullYear();
export const MAX_VEHICLE_YEAR = CURRENT_YEAR + 1;
const TRANSMISSION_OPTIONS = ["Automatic", "Manual"] as const;
const FUEL_TYPE_OPTIONS = ["Gasoline", "Diesel", "Hybrid", "Electric"] as const;

export const emptyVehicle: Omit<Vehicle, "id"> = {
  year: CURRENT_YEAR,
  make: "",
  model: "",
  category: "sedan",
  images: [],
  specs: {
    passengers: 5,
    luggage: 2,
    transmission: "Automatic",
    fuelType: "Gasoline",
    mpg: 30,
    doors: 4,
  },
  dailyRate: 0,
  purchasePrice: 0,
  features: [],
  isAvailable: true,
  isPublished: true,
  description: "",
  color: "White",
  mileage: 0,
  licensePlate: "",
  vin: "",
  maintenanceStatus: "good",
  isFinanced: false,
  monthlyPayment: 0,
  paymentDayOfMonth: 1,
  financingStartDate: "",
};

export interface VehicleFormState extends Omit<Vehicle, "id"> {
  featureInput?: string;
}

export interface VehicleFormProps {
  form: VehicleFormState;
  setForm: (form: VehicleFormState) => void;
  formKey: "new" | string;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  onAddFeature: (formKey: "new" | string, featureInput: string) => void;
  onRemoveFeature: (index: number, formKey: "new" | string) => void;
  onSyncImages?: (vehicleId: string, images: string[]) => void;
  onError: (message: string) => void;
}

export function VehicleForm({
  form,
  setForm,
  formKey,
  onSave,
  onCancel,
  isSaving,
  onAddFeature,
  onRemoveFeature,
  onSyncImages,
  onError,
}: VehicleFormProps) {
  return (
    <Card className="mb-4 border-purple-200">
      <CardContent className="p-4">
        <h3 className="font-semibold text-gray-900 mb-3">
          {formKey === "new"
            ? "Add New Vehicle"
            : `Edit: ${form.year} ${form.make} ${form.model}`.trim()}
        </h3>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                Year
              </label>
              <Input
                type="number"
                value={form.year ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm({ ...form, year: val === "" ? CURRENT_YEAR : Number(val) });
                }}
                min="1990"
                max={MAX_VEHICLE_YEAR}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                Make <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.make || ""}
                onChange={(e) => setForm({ ...form, make: e.target.value })}
                placeholder="e.g. Toyota"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                Model <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.model || ""}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="e.g. Camry"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                Category
              </label>
              <Select
                value={form.category || "sedan"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category: e.target.value as VehicleCategory,
                  })
                }
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                Daily Rate ($)
              </label>
              <Input
                type="number"
                value={form.dailyRate || 0}
                onChange={(e) => {
                  const val = e.target.value;
                  const num = val === "" ? 0 : parseFloat(val);
                  setForm({ ...form, dailyRate: isNaN(num) ? 0 : num });
                }}
                min="0"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                Purchase Price ($)
              </label>
              <Input
                type="number"
                value={form.purchasePrice || 0}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm({ ...form, purchasePrice: val === "" ? 0 : Number(val) });
                }}
                min="0"
                step="100"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                Available
              </label>
              <Select
                value={form.isAvailable ? "yes" : "no"}
                onChange={(e) =>
                  setForm({ ...form, isAvailable: e.target.value === "yes" })
                }
              >
                <option value="yes">Available</option>
                <option value="no">Unavailable</option>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                Published
              </label>
              <Select
                value={form.isPublished !== false ? "yes" : "no"}
                onChange={(e) =>
                  setForm({ ...form, isPublished: e.target.value === "yes" })
                }
              >
                <option value="yes">Visible</option>
                <option value="no">Hidden</option>
              </Select>
            </div>
          </div>

          <div className="border border-purple-200 rounded-lg p-2.5 bg-purple-50/50">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                Vehicle Financing
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={form.isFinanced}
                aria-label="Toggle vehicle financing"
                onClick={() => setForm({ ...form, isFinanced: !form.isFinanced })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  form.isFinanced ? "bg-purple-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    form.isFinanced ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            {!form.isFinanced && (
              <p className="text-xs text-gray-400">Enable to track monthly payments and financing details.</p>
            )}
            {form.isFinanced && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                    Monthly Payment ($)
                  </label>
                  <Input
                    type="number"
                    value={form.monthlyPayment || 0}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm({ ...form, monthlyPayment: val === "" ? 0 : Number(val) });
                    }}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                    Payment Day (1-31)
                  </label>
                  <Input
                    type="number"
                    value={form.paymentDayOfMonth ?? 1}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        paymentDayOfMonth: Math.min(31, Math.max(1, Number(e.target.value))),
                      })
                    }
                    min="1"
                    max="31"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                    Financing Start
                  </label>
                  <DatePicker
                    value={form.financingStartDate || ""}
                    onChange={(val) =>
                      setForm({ ...form, financingStartDate: val })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                Color
              </label>
              <Input
                value={form.color || ""}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder="e.g. White"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                License Plate
              </label>
              <Input
                value={form.licensePlate || ""}
                onChange={(e) =>
                  setForm({ ...form, licensePlate: e.target.value })
                }
                placeholder="ABC-1234"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                VIN
              </label>
              <Input
                value={form.vin || ""}
                onChange={(e) => setForm({ ...form, vin: e.target.value })}
                placeholder="Vehicle ID Number"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                Mileage
              </label>
              <Input
                type="number"
                value={form.mileage || 0}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm({ ...form, mileage: val === "" ? 0 : Number(val) });
                }}
                min="0"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                Maintenance
              </label>
              <Select
                value={form.maintenanceStatus || "good"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maintenanceStatus: e.target.value as
                      | "good"
                      | "needs-service"
                      | "in-maintenance",
                  })
                }
              >
                <option value="good">Good</option>
                <option value="needs-service">Needs Service</option>
                <option value="in-maintenance">In Maintenance</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
              Description
            </label>
            <Textarea
              value={form.description || ""}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Brief description of the vehicle"
              rows={2}
            />
          </div>

          <VehicleImageManager
            vehicleId={formKey}
            images={form.images || []}
            onImagesChange={(images) => setForm({ ...form, images })}
            onSaved={
              formKey !== "new" && onSyncImages
                ? (images) => onSyncImages(formKey, images)
                : undefined
            }
            onError={onError}
            disabled={isSaving}
          />

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">
              Features
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(form.features || []).map((feature, idx) => (
                <Badge
                  key={`${feature}-${idx}`}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {feature}
                  <button
                    type="button"
                    onClick={() => onRemoveFeature(idx, formKey)}
                    aria-label={`Remove ${feature}`}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={form.featureInput || ""}
                onChange={(e) =>
                  setForm({ ...form, featureInput: e.target.value })
                }
                placeholder="Add a feature (e.g. Leather seats)"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddFeature(formKey, form.featureInput || "");
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={!form.featureInput?.trim()}
                aria-label="Add feature"
                onClick={() =>
                  onAddFeature(formKey, form.featureInput || "")
                }
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
          </div>

          <div className="border-t pt-3">
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5 text-gray-500" />
              Vehicle Specifications
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                  Passengers
                </label>
                <Input
                  type="number"
                  value={form.specs?.passengers ?? 5}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm({
                      ...form,
                      specs: {
                        ...(form.specs || emptyVehicle.specs),
                        passengers: val === "" ? 1 : Number(val),
                      },
                    });
                  }}
                  min="1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                  Luggage
                </label>
                <Input
                  type="number"
                  value={form.specs?.luggage ?? 2}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm({
                      ...form,
                      specs: {
                        ...(form.specs || emptyVehicle.specs),
                        luggage: val === "" ? 0 : Number(val),
                      },
                    });
                  }}
                  min="0"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                  Doors
                </label>
                <Input
                  type="number"
                  value={form.specs?.doors ?? 4}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm({
                      ...form,
                      specs: {
                        ...(form.specs || emptyVehicle.specs),
                        doors: val === "" ? 4 : Number(val),
                      },
                    });
                  }}
                  min="2"
                  max="5"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                  Transmission
                </label>
                <Select
                  value={form.specs?.transmission || "Automatic"}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      specs: {
                        ...form.specs!,
                        transmission: e.target.value as
                          | "Automatic"
                          | "Manual",
                      },
                    })
                  }
                >
                  {TRANSMISSION_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                  Fuel Type
                </label>
                <Select
                  value={form.specs?.fuelType || "Gasoline"}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      specs: {
                        ...form.specs!,
                        fuelType: e.target.value as
                          | "Gasoline"
                          | "Diesel"
                          | "Hybrid"
                          | "Electric",
                      },
                    })
                  }
                >
                  {FUEL_TYPE_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
                  MPG
                </label>
                <Input
                  type="number"
                  value={form.specs?.mpg ?? 30}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm({
                      ...form,
                      specs: {
                        ...(form.specs || emptyVehicle.specs),
                        mpg: val === "" ? 0 : Number(val),
                      },
                    });
                  }}
                  min="5"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t">
            <Button
              onClick={onSave}
              disabled={isSaving || !form.make?.trim() || !form.model?.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSaving ? <><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Saving...</> : <><Check className="h-4 w-4 mr-1" /> Save</>}
            </Button>
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
