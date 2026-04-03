"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
}

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

export function PullToRefresh({ children, onRefresh, className }: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [touching, setTouching] = useState(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only enable PTR when scrolled to top
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;

    startYRef.current = e.touches[0].clientY;
    setTouching(true);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touching || refreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    if (diff > 0) {
      // Apply rubber-band resistance
      const dampened = Math.min(diff * 0.5, MAX_PULL);
      setPullDistance(dampened);

      // Prevent default scroll when pulling down
      if (diff > 10) {
        e.preventDefault();
      }
    }
  }, [touching, refreshing]);

  const handleTouchEnd = useCallback(async () => {
    setTouching(false);

    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(PULL_THRESHOLD * 0.6); // Hold at indicator position

      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const showSpinner = refreshing || pullDistance > 10;

  return (
    <div ref={containerRef} className={cn("relative overflow-y-auto", className)}>
      {/* Pull indicator */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-10 flex items-center justify-center transition-opacity duration-200"
        style={{
          top: Math.max(pullDistance - 40, -40),
          opacity: showSpinner ? 1 : 0,
        }}
      >
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-lg border border-gray-100",
          refreshing && "shadow-purple-100"
        )}>
          <RefreshCw
            className={cn(
              "h-5 w-5 text-purple-600 transition-transform",
              refreshing && "animate-spin"
            )}
            style={{
              transform: refreshing
                ? undefined
                : `rotate(${progress * 360}deg)`,
            }}
          />
        </div>
      </div>

      {/* Content wrapper with pull translation */}
      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: touching ? "none" : "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
