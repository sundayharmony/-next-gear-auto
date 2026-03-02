"use client";

import { useState, useCallback } from "react";

const MAX_COMPARE = 4;

export function useComparison() {
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((v) => v !== id);
      }
      if (prev.length >= MAX_COMPARE) {
        return prev; // Don't add more than max
      }
      return [...prev, id];
    });
  }, []);

  const removeFromCompare = useCallback((id: string) => {
    setCompareIds((prev) => prev.filter((v) => v !== id));
  }, []);

  const clearComparison = useCallback(() => {
    setCompareIds([]);
  }, []);

  const isComparing = useCallback(
    (id: string) => compareIds.includes(id),
    [compareIds]
  );

  return {
    compareIds,
    compareCount: compareIds.length,
    maxCompare: MAX_COMPARE,
    toggleCompare,
    removeFromCompare,
    clearComparison,
    isComparing,
    canAddMore: compareIds.length < MAX_COMPARE,
  };
}
