"use client";

import { useEffect } from "react";

let lockCount = 0;
let previousOverflow = "";
let previousPaddingRight = "";

/** Prevent the page behind an open overlay from scrolling. Supports stacked overlays. */
export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    lockCount += 1;
    if (lockCount === 1) {
      const { body } = document;
      previousOverflow = body.style.overflow;
      previousPaddingRight = body.style.paddingRight;
      const scrollbarGap = window.innerWidth - document.documentElement.clientWidth;

      body.style.overflow = "hidden";
      if (scrollbarGap > 0) {
        body.style.paddingRight = `${scrollbarGap}px`;
      }
    }

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        const { body } = document;
        body.style.overflow = previousOverflow;
        body.style.paddingRight = previousPaddingRight;
      }
    };
  }, [locked]);
}
