import { cn } from '../../lib/utils';

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-muted/80', className)}
      {...props}
    />
  );
}

export function SkeletonStatCard() {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTaskRow() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-sm">
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 max-w-[200px] w-[65%]" />
        <Skeleton className="h-3 max-w-[120px] w-[40%]" />
      </div>
      <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
    </div>
  );
}

export function SkeletonNotificationRow() {
  return (
    <div className="flex gap-3 border-b border-border/50 px-3 py-3 last:border-0">
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-full max-w-[240px]" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function SkeletonActivityRow() {
  return (
    <div className="flex gap-3 py-3">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-full max-w-[280px]" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function DashboardPageSkeleton({ showAdminColumn = false }) {
  const n = showAdminColumn ? 5 : 4;
  return (
    <div className="space-y-6">
      <Skeleton className="h-36 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className={`grid gap-4 sm:grid-cols-2 ${showAdminColumn ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
        {Array.from({ length: n }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
          <Skeleton className="mb-4 h-5 w-40" />
          <Skeleton className="mx-auto mb-4 h-36 w-36 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
          <Skeleton className="mb-4 h-5 w-48" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonTaskRow key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
