"use client";

export default function AdminVehicleDetailsError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <div className="p-6 space-y-3">
      <p className="text-sm text-red-600">Failed to load vehicle details.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded bg-purple-600 px-3 py-1.5 text-white text-sm hover:bg-purple-700"
      >
        Retry
      </button>
    </div>
  );
}

