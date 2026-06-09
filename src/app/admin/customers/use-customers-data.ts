"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { logger } from "@/lib/utils/logger";

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
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async (query = "") => {
    setLoading(true);
    try {
      const url = query
        ? `/api/admin/customers?search=${encodeURIComponent(query)}`
        : "/api/admin/customers";
      const res = await adminFetch(url);
      if (!res.ok) throw new Error("Failed to fetch customers");
      const data = await res.json();
      if (data.success) setCustomers(data.data);
    } catch (err) {
      logger.error("Failed to fetch customers:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return { customers, setCustomers, loading, fetchCustomers };
}
