/**
 * V3 Skeletons — purple-tinted shimmer for premium loading state.
 * Use inside `.v3-theme` containers (V3Layout already provides it).
 */

export function V3Skeleton({ className = "" }: { className?: string }) {
  return <div className={`v3-skeleton rounded-xl ${className}`} />;
}

export function V3PageSkeleton() {
  return (
    <div className="px-4 py-6 space-y-5">
      <V3Skeleton className="h-8 w-2/3" />
      <V3Skeleton className="h-4 w-1/2" />
      <V3Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-2 gap-3">
        <V3Skeleton className="h-28" />
        <V3Skeleton className="h-28" />
      </div>
      <V3Skeleton className="h-20 w-full" />
      <V3Skeleton className="h-20 w-full" />
    </div>
  );
}

export function V3DetailSkeleton() {
  return (
    <div className="pb-8">
      <V3Skeleton className="h-[260px] w-full rounded-none" />
      <div className="px-4 -mt-8 relative space-y-4">
        <V3Skeleton className="h-6 w-24 rounded-full" />
        <V3Skeleton className="h-7 w-3/4" />
        <V3Skeleton className="h-4 w-1/2" />
        <V3Skeleton className="h-4 w-1/3" />
        <V3Skeleton className="h-12 w-full" />
        <V3Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

export function V3CardSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div className={`shrink-0 rounded-2xl overflow-hidden v3-glass ${wide ? "w-[280px]" : "w-[200px]"}`}>
      <V3Skeleton className={`rounded-none ${wide ? "h-[160px]" : "h-[130px]"}`} />
      <div className="p-3 space-y-2">
        <V3Skeleton className="h-4 w-full" />
        <V3Skeleton className="h-3 w-2/3" />
        <V3Skeleton className="h-7 w-full mt-1" />
      </div>
    </div>
  );
}
