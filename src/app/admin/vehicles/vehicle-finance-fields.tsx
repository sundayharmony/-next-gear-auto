"use client";

import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import type { VehicleFormState } from "./vehicle-form-defaults";

export function VehicleFinanceFields({
  form,
  setForm,
}: {
  form: VehicleFormState;
  setForm: (form: VehicleFormState) => void;
}) {
  return (
    <div className="border border-purple-200 rounded-lg p-2.5 bg-purple-50/50 space-y-2">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5 block">
          Monthly insurance ($)
        </label>
        <Input
          type="number"
          value={form.monthlyInsurance || 0}
          onChange={(e) => {
            const val = e.target.value;
            setForm({ ...form, monthlyInsurance: val === "" ? 0 : Number(val) });
          }}
          min="0"
          step="0.01"
        />
        <p className="text-xs text-gray-400 mt-0.5">
          Weekly owner payout tracker prorates this Mon–Sun.
        </p>
      </div>

      <div className="flex items-center justify-between">
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
              onChange={(val) => setForm({ ...form, financingStartDate: val })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
