"use client";

import { useState, useEffect } from "react";

/**
 * Shared hook for auto-dismissing error/success toast state.
 * Used by all admin pages to eliminate repeated boilerplate.
 *
 * Usage:
 *   const { error, setError, success, setSuccess } = useAutoToast();
 */
export function useAutoToast(errorTimeout = 5000, successTimeout = 3000) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), errorTimeout);
      return () => clearTimeout(t);
    }
  }, [error, errorTimeout]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), successTimeout);
      return () => clearTimeout(t);
    }
  }, [success, successTimeout]);

  return { error, setError, success, setSuccess };
}
