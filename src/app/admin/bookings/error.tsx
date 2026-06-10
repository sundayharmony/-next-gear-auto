"use client";

import { StaffPanelError } from "@/components/staff/staff-panel-feedback";

export default function AdminBookingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <StaffPanelError
      title="We could not load bookings right now."
      reset={reset}
      digest={error?.digest}
    />
  );
}
