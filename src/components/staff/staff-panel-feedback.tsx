import { Loader2, AlertTriangle } from "lucide-react";

export function StaffPanelLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" aria-busy="true" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export function StaffPanelError({
  title,
  reset,
  digest,
}: {
  title: string;
  reset: () => void;
  digest?: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8">
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center max-w-md">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-500 mb-3" />
        <h2 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h2>
        <p className="text-sm text-red-600 mb-1">{title}</p>
        <p className="text-xs text-red-500 mb-4">
          {digest ? `Reference: ${digest}` : "Try again in a moment."}
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
