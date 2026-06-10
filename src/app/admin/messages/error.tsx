"use client";

import { StaffPanelError } from "@/components/staff/staff-panel-feedback";

export default function AdminMessagesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <StaffPanelError
      title="We could not load messages right now."
      reset={reset}
      digest={error?.digest}
    />
  );
}
