"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Render staff overlays on document.body so mobile fixed panels are not clipped by scroll containers. */
export function StaffPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}
