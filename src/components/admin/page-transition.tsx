"use client";

import React from "react";

/**
 * Wraps page content with a subtle fade-in + slide-up animation.
 * Mimics native iOS page appearance.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out fill-mode-both">
      {children}
    </div>
  );
}
