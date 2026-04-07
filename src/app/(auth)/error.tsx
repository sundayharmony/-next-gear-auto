"use client";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center max-w-md shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Authentication Error</h2>
        <p className="text-sm text-gray-600 mb-4">
          {error.message || "Something went wrong. Please try again."}
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
