"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/** Generic GET hook for owner-portal endpoints (CSRF + refresh handled by adminFetch). */
export function useOwnerApi<T>(url: string): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json.data as T);
        setError(null);
      } else {
        setError(json.message || "Failed to load data");
      }
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}
