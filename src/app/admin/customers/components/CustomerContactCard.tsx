"use client";

import { Edit2 } from "lucide-react";
import { AdminCard, AdminSection } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils/date-helpers";
import type { CustomerRow } from "../use-customers-data";
import type { CustomerStats } from "../customer-detail-types";
import type { useCustomerDetail } from "../use-customer-detail";

type Detail = ReturnType<typeof useCustomerDetail>;

export function CustomerContactCard({
  customer,
  stats,
  canMutateCustomers,
  detail,
}: {
  customer: CustomerRow;
  stats: CustomerStats;
  canMutateCustomers: boolean;
  detail: Pick<
    Detail,
    | "editingMode"
    | "editName"
    | "setEditName"
    | "editEmail"
    | "setEditEmail"
    | "editPhone"
    | "setEditPhone"
    | "savingEdit"
    | "startEditingCustomer"
    | "cancelCustomerEdit"
    | "saveCustomerEdit"
  >;
}) {
  return (
    <AdminSection
      title="Contact"
      actions={
        canMutateCustomers && !detail.editingMode ? (
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={detail.startEditingCustomer} aria-label="Edit customer">
            <Edit2 className="h-4 w-4" />
          </Button>
        ) : null
      }
    >
      <AdminCard>
        <div className="space-y-3 text-sm">
          <Field label="Full name" editing={detail.editingMode}>
            {detail.editingMode ? (
              <Input value={detail.editName} onChange={(e) => detail.setEditName(e.target.value)} />
            ) : (
              <p className="font-medium text-gray-900">{customer.name}</p>
            )}
          </Field>
          <Field label="Email" editing={detail.editingMode}>
            {detail.editingMode ? (
              <Input type="email" value={detail.editEmail} onChange={(e) => detail.setEditEmail(e.target.value)} />
            ) : (
              <p className="text-gray-700">{customer.email}</p>
            )}
          </Field>
          <Field label="Phone" editing={detail.editingMode}>
            {detail.editingMode ? (
              <Input value={detail.editPhone} onChange={(e) => detail.setEditPhone(e.target.value)} />
            ) : (
              <p className="text-gray-700">{customer.phone || "Not provided"}</p>
            )}
          </Field>
          <Field label="Member since">
            <p className="font-medium text-gray-900">{formatDate(customer.createdAt)}</p>
          </Field>
          {stats.firstBooking ? (
            <Field label="First booking">
              <p className="font-medium text-gray-900">{formatDate(stats.firstBooking.created_at)}</p>
            </Field>
          ) : null}
          {stats.lastBooking ? (
            <Field label="Last booking">
              <p className="font-medium text-gray-900">{formatDate(stats.lastBooking.created_at)}</p>
            </Field>
          ) : null}
        </div>
        {detail.editingMode ? (
          <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
            <Button type="button" size="sm" className="flex-1" disabled={detail.savingEdit} onClick={() => void detail.saveCustomerEdit()}>
              Save
            </Button>
            <Button type="button" size="sm" variant="outline" className="flex-1" onClick={detail.cancelCustomerEdit}>
              Cancel
            </Button>
          </div>
        ) : null}
      </AdminCard>
    </AdminSection>
  );
}

function Field({
  label,
  children,
  editing,
}: {
  label: string;
  children: React.ReactNode;
  editing?: boolean;
}) {
  return (
    <div>
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
      <div className={editing ? "mt-1" : "mt-0.5"}>{children}</div>
    </div>
  );
}
