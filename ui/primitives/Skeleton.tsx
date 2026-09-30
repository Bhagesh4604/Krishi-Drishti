interface SkeletonProps { className?: string }

/** Shimmering placeholder used during async loads. */
export default function Skeleton({ className = "h-24 w-full" }: SkeletonProps) {
  return <div className={`skeleton ${className}`} aria-busy="true" aria-live="polite" />;
}

export function WidgetSkeleton() {
  return (
    <div className="glass p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-2xl" />
        <Skeleton className="h-5 w-40" />
      </div>
      <Skeleton className="h-32 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}
