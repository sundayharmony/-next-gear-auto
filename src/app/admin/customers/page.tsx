"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { useAutoToast } from "@/lib/hooks/useAutoToast";
import { usePagination } from "@/components/ui/pagination";
import { logger } from "@/lib/utils/logger";
import {
  adminPanelConfig,
  type StaffPanelConfig,
} from "@/lib/admin/staff-panel-config";
import { useAuth } from "@/lib/context/auth-context";
import { userHasRole } from "@/lib/auth/user-roles";
import { useCustomersData, type CustomerRow } from "./use-customers-data";
import { CustomerListPanel } from "./customer-list-panel";
import { CustomerDetailDrawer } from "./customer-detail-drawer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminCustomersPage({
  panelConfig = adminPanelConfig,
}: {
  panelConfig?: StaffPanelConfig;
}) {
  const panelBase = panelConfig.panelBase;
  const isAdminPanel = panelConfig.panelMode === "admin";
  const { user } = useAuth();
  const canMutateCustomers = isAdminPanel && userHasRole(user, "admin");
  const {
    error: toastError,
    setError: setToastError,
    success: toastSuccess,
    setSuccess: setToastSuccess,
  } = useAutoToast();
  const { customers, setCustomers, loading, fetchCustomers } = useCustomersData();
  const [searchInput, setSearchInput] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const { currentPage, pageSize, handlePageChange, handlePageSizeChange, resetPage, paginateArray } =
    usePagination(12);

  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");

  useEffect(() => {
    if (highlightId && customers.length > 0 && !selectedCustomer) {
      const found = customers.find((c) => c.id === highlightId);
      if (found) setSelectedCustomer(found);
    }
  }, [highlightId, customers, selectedCustomer]);

  const handleSearch = () => {
    fetchCustomers(searchInput.trim());
    resetPage();
  };

  const handleDeleteFromList = async (customer: CustomerRow) => {
    if (!confirm(`Delete customer "${customer.name}"?`)) return;
    try {
      const res = await adminFetch(`/api/admin/customers?id=${customer.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        fetchCustomers();
        setToastSuccess("Customer deleted");
      } else {
        setToastError("Failed to delete customer");
      }
    } catch (err) {
      logger.error("Failed to delete:", err);
      setToastError("Error deleting customer");
    }
  };

  const toastNode = (
    <>
      {toastSuccess && (
        <div className="fixed top-4 right-4 lg:left-64 lg:right-4 z-[60] rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 shadow-lg">
          {toastSuccess}
        </div>
      )}
      {toastError && (
        <div className="fixed top-4 right-4 lg:left-64 lg:right-4 z-[60] rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 shadow-lg">
          {toastError}
        </div>
      )}
    </>
  );

  return (
    <>
      {toastNode}
      <AdminPageHeader title="Customers" subtitle={`${customers.length} total customers`} />

      <div className="xl:grid xl:grid-cols-[minmax(280px,360px)_1fr] xl:min-h-0">
        <div className={selectedCustomer ? "max-xl:hidden" : "block"}>
          <CustomerListPanel
            customers={customers}
            paginatedCustomers={paginateArray(customers)}
            loading={loading}
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            onSearch={handleSearch}
            onRefresh={() => {
              setSearchInput("");
              fetchCustomers();
            }}
            onOpenCustomer={setSelectedCustomer}
            onDeleteCustomer={handleDeleteFromList}
            onAddCustomer={() => setShowAddCustomerModal(true)}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            selectedCustomerId={selectedCustomer?.id}
          />
        </div>

        {selectedCustomer ? (
          <div className="max-xl:fixed max-xl:inset-0 max-xl:z-50 max-xl:overflow-y-auto max-xl:bg-white xl:min-w-0">
            <CustomerDetailDrawer
              customer={selectedCustomer}
              panelBase={panelBase}
              canMutateCustomers={canMutateCustomers}
              setCustomers={setCustomers}
              onClose={() => setSelectedCustomer(null)}
              onSuccess={setToastSuccess}
              onError={setToastError}
              onRefreshList={() => fetchCustomers()}
            />
          </div>
        ) : (
          <div className="hidden xl:flex items-center justify-center p-12 text-gray-500 border-l border-gray-200 bg-gray-50/50">
            <p className="text-sm">Select a customer from the list to view details</p>
          </div>
        )}
      </div>

      {showAddCustomerModal && (
        <AddCustomerModal
          onClose={() => setShowAddCustomerModal(false)}
          onCreated={() => {
            setShowAddCustomerModal(false);
            fetchCustomers();
            setToastSuccess("Customer created successfully");
          }}
          onError={setToastError}
        />
      )}
    </>
  );
}

function AddCustomerModal({
  onClose,
  onCreated,
  onError,
}: {
  onClose: () => void;
  onCreated: () => void;
  onError: (message: string) => void;
}) {
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAddCustomer = async () => {
    if (!formName || !formEmail) {
      onError("Name and email are required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminFetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          phone: formPhone,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onCreated();
      } else {
        onError("Failed to create customer: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      logger.error("Failed to create customer:", err);
      onError("Error creating customer");
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <h2 className="text-lg font-bold mb-4">Add New Customer</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-600 font-semibold">
                Full Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="John Doe"
                className="mt-1"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 font-semibold">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="john@example.com"
                className="mt-1"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 font-semibold">Phone (optional)</label>
              <Input
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <Button onClick={handleAddCustomer} disabled={submitting} className="flex-1">
              Create Customer
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
