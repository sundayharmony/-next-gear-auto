"use client";

export default function BookingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8">
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-8 text-center max-w-md">
        <h2 className="text-lg font-semibold text-orange-800 mb-2">Booking Error</h2>
        <p className="text-sm text-orange-600 mb-4">
          {error.message || "Something went wrong with your booking. Please try again."}
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
