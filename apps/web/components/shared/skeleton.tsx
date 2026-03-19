import { cn } from '@/lib/utils'

export function Skeleton({ className }: Readonly<{ className?: string }>) {
  return <div aria-hidden className={cn('skeleton-shimmer rounded-2xl bg-[rgba(255,255,255,0.04)]', className)} />
}

export function MetricCardSkeleton() {
  return (
    <article className="imperial-card-stat space-y-3 p-5">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20 rounded-full" />
        <Skeleton className="h-6 w-32 rounded-lg" />
      </div>
      <Skeleton className="h-12 rounded-2xl" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="h-3 w-16 rounded-full" />
      </div>
    </article>
  )
}

export function CardSkeleton({ rows = 1 }: Readonly<{ rows?: number }>) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="imperial-card h-24 space-y-3 p-5">
          <Skeleton className="h-6 w-40 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 rounded-full" />
            <Skeleton className="h-4 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CardRowSkeleton({ rows = 3 }: Readonly<{ rows?: number }>) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div className="imperial-card-soft flex items-center gap-4 px-4 py-3" key={i}>
          <Skeleton className="size-12 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2 rounded-full" />
            <Skeleton className="h-3 w-1/3 rounded-full" />
          </div>
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="imperial-card space-y-4 p-6">
      <Skeleton className="h-6 w-40 rounded-lg" />
      <Skeleton className="h-64 rounded-2xl" />
      <div className="flex gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 rounded-full" />
        ))}
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: Readonly<{ rows?: number }>) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="imperial-card-soft flex gap-4 px-4 py-3">
        <Skeleton className="h-4 w-20 flex-1 rounded-full" />
        <Skeleton className="h-4 w-20 flex-1 rounded-full" />
        <Skeleton className="h-4 w-20 rounded-full" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="imperial-card-soft flex gap-4 px-4 py-3">
          <Skeleton className="h-4 w-20 flex-1 rounded-full" />
          <Skeleton className="h-4 w-20 flex-1 rounded-full" />
          <Skeleton className="h-4 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}
