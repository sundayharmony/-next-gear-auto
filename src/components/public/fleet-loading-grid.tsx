import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton grid shown while the public fleet list loads. */
export function FleetLoadingGrid({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-gray-100 bg-white">
          <Skeleton className="aspect-[16/10] w-full rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex justify-between border-t border-gray-100 pt-4">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
