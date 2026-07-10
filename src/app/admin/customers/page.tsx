"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminPageHeader, AdminPageBody } from "@/components/admin/admin-shell";
import { useNotification } from "@/lib/context/notification-context";
import { usePagination } from "@/components/ui/pagination";
import {
  adminPanelConfig,
  type StaffPanelConfig,
} from "@/lib/admin/staff-panel-config";
import { useAuth } from "@/lib/context/auth-context";
import { userHasRole } from "@/lib/auth/user-roles";
import { useCustomersData } from "./use-customers-data";
import { CustomersWorkspace } from "./components/CustomersWorkspace";
import { CustomerDetailSheet } from "./customer-detail-sheet";
import { AddCustomerModal } from "./components/AddCustomerModal";

export default function AdminCustomersPage({
  panelConfig = adminPanelConfig,
}: {
  panelConfig?: StaffPanelConfig;
}) {
  const panelBase = panelConfig.panelBase;
  const isAdminPanel = panelConfig.panelMode === "admin";
  const { user } = useAuth();
  const canMutateCustomers = isAdminPanel && userHasRole(user, "admin");
  const { showToast } = useNotification();
  const { customers, setCustomers, loading, fetchCustomers } = useCustomersData();
  const [searchInput, setSearchInput] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<
    import("./use-customers-data").CustomerRow | null
  >(null);
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

  const notifySuccess = (message: string) => showToast("success", "Success", message);
  const notifyError = (message: string) => showToast("error", "Error", message);

  return (
    <>
      <AdminPageHeader title="Customers" subtitle={`${customers.length} total customers`} />
      <AdminPageBody className="py-5 sm:py-6 space-y-4">
        <CustomersWorkspace
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
          selectedCustomer={selectedCustomer}
          onSelectCustomer={setSelectedCustomer}
          onAddCustomer={() => setShowAddCustomerModal(true)}
          canAddCustomer={canMutateCustomers}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          panelBase={panelBase}
          canMutateCustomers={canMutateCustomers}
          setCustomers={setCustomers}
          onSuccess={notifySuccess}
          onError={notifyError}
          onRefreshList={() => fetchCustomers()}
        />
      </AdminPageBody>

      {selectedCustomer ? (
        <CustomerDetailSheet
          customer={selectedCustomer}
          open={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          panelBase={panelBase}
          canMutateCustomers={canMutateCustomers}
          setCustomers={setCustomers}
          onSuccess={notifySuccess}
          onError={notifyError}
          onRefreshList={() => fetchCustomers()}
        />
      ) : null}

      {showAddCustomerModal ? (
        <AddCustomerModal
          onClose={() => setShowAddCustomerModal(false)}
          onCreated={() => {
            setShowAddCustomerModal(false);
            fetchCustomers();
            notifySuccess("Customer created successfully");
          }}
          onError={notifyError}
        />
      ) : null}
    </>
  );
}
