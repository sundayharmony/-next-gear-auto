"use client";

import { useState, useEffect, useRef } from "react";

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
  const errorTimeoutRef = useRef<NodeJS.Timeout>();
  const successTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (error) {
      errorTimeoutRef.current = setTimeout(() => setError(null), errorTimeout);
      return () => {
        if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      };
    }
  }, [error, errorTimeout]);

  useEffect(() => {
    if (success) {
      successTimeoutRef.current = setTimeout(() => setSuccess(null), successTimeout);
      return () => {
        if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      };
    }
  }, [success, successTimeout]);

  return { error, setError, success, setSuccess };
}
