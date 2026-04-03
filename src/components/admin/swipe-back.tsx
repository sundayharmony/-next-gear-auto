"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Detects left-edge swipe gestures and triggers browser back navigation.
 * Mimics iOS native swipe-to-go-back behavior in PWA standalone mode.
 */
export function SwipeBack({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const EDGE_ZONE = 24; // px from left edge to trigger
  const THRESHOLD = 100; // px needed to complete swipe

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    if (touch.clientX <= EDGE_ZONE) {
      startRef.current = { x: touch.clientX, y: touch.clientY };
      setSwiping(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!startRef.current || !swiping) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startRef.current.x;
    const dy = Math.abs(touch.clientY - startRef.current.y);

    // Cancel if vertical movement exceeds horizontal (scrolling)
    if (dy > dx) {
      setSwiping(false);
      startRef.current = null;
      setSwipeProgress(0);
      return;
    }

    if (dx > 10) {
      e.preventDefault();
      setSwipeProgress(Math.min(dx / THRESHOLD, 1));
    }
  }, [swiping]);

  const handleTouchEnd = useCallback(() => {
    if (swipeProgress >= 0.5) {
      router.back();
    }
    setSwipeProgress(0);
    setSwiping(false);
    startRef.current = null;
  }, [swipeProgress, router]);

  useEffect(() => {
    const opts: AddEventListenerOptions = { passive: false };
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, opts);
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <>
      {/* Edge swipe indicator */}
      {swiping && swipeProgress > 0 && (
        <div
          className="fixed top-0 left-0 bottom-0 z-[100] pointer-events-none"
          style={{
            width: `${swipeProgress * 24}px`,
            background: `linear-gradient(to right, rgba(124,58,237,${swipeProgress * 0.2}), transparent)`,
            transition: swiping ? "none" : "all 0.2s ease-out",
          }}
        />
      )}
      {children}
    </>
  );
}
