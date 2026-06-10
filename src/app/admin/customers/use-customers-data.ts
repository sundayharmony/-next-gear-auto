"use client";

import { useCallback, useState, type SetStateAction } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { staffKeys, useStaffQuery } from "@/lib/hooks/use-staff-query";

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
  profilePictureUrl?: string;
  idDocumentUrl?: string | null;
}

export function useCustomersData() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const customersUrl = search
    ? `/api/admin/customers?search=${encodeURIComponent(search)}`
    : "/api/admin/customers";

  const query = useStaffQuery<CustomerRow[]>(
    staffKeys.customers(search),
    customersUrl,
    { placeholderData: (prev) => prev }
  );

  const fetchCustomers = useCallback((queryStr = "") => {
    setSearch(queryStr);
  }, []);

  const setCustomers = useCallback(
    (updater: SetStateAction<CustomerRow[]>) => {
      queryClient.setQueryData<CustomerRow[]>(staffKeys.customers(search), (prev) =>
        typeof updater === "function" ? updater(prev ?? []) : updater
      );
    },
    [queryClient, search]
  );

  return {
    customers: query.data ?? [],
    setCustomers,
    loading: query.isFetching,
    fetchCustomers,
    refetch: () => query.refetch(),
  };
}
