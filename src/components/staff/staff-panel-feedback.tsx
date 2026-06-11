import Link from "next/link";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StaffPanelLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" aria-busy="true" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}

export function StaffPanelError({
  title,
  reset,
  digest,
  backHref,
  backLabel = "Back to dashboard",
}: {
  title: string;
  reset: () => void;
  digest?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8">
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center max-w-md dark:border-red-900/50 dark:bg-red-950/40">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-500 mb-3" aria-hidden />
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Something went wrong</h2>
        <p className="text-sm text-red-700 dark:text-red-300 mb-1">{title}</p>
        <p className="text-xs text-red-600 dark:text-red-400 mb-4">
          {digest ? `Reference: ${digest}` : "Try again in a moment."}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <Button onClick={reset} size="sm" className="bg-red-600 hover:bg-red-700 text-white">
            Try again
          </Button>
          {backHref ? (
            <Button asChild variant="outline" size="sm" className="border-red-200 text-red-700 dark:border-red-800 dark:text-red-200">
              <Link href={backHref}>{backLabel}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
