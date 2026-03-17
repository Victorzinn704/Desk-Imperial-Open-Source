import { cn } from '@/lib/utils'

export function Skeleton({ className }: Readonly<{ className?: string }>) {
  return <div aria-hidden className={cn('skeleton-shimmer rounded-2xl', className)} />
}

export function MetricCardSkeleton() {
  return (
    <article className="imperial-card-stat p-5">
      <Skeleton className="size-11 rounded-2xl" />
      <Skeleton className="mt-5 h-3.5 w-20 rounded-full" />
      <Skeleton className="mt-2 h-8 w-28 rounded-xl" />
      <Skeleton className="mt-2 h-3.5 w-24 rounded-full" />
    </article>
  )
}

export function CardRowSkeleton({ rows = 3 }: Readonly<{ rows?: number }>) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div className="imperial-card-stat flex items-center gap-4 px-4 py-3" key={i}>
          <Skeleton className="size-8 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2 rounded-full" />
            <Skeleton className="h-3 w-1/3 rounded-full" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}
