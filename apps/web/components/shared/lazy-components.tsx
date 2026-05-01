'use client'

/**
 * Lazy-loaded components for mobile performance optimization.
 * These components are loaded on-demand to reduce initial bundle size.
 */

import dynamic from 'next/dynamic'

// Loading skeletons for lazy components
function MapSkeleton() {
  return (
    <div className="w-full h-full bg-[var(--surface,#0d1014)] animate-pulse rounded-xl flex items-center justify-center">
      <span className="text-[var(--text-soft,#7a8896)] text-sm">Carregando mapa...</span>
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="w-full h-full bg-[var(--surface,#0d1014)] animate-pulse rounded-xl flex items-center justify-center min-h-[200px]">
      <span className="text-[var(--text-soft,#7a8896)] text-sm">Carregando gráfico...</span>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="w-full bg-[var(--surface,#0d1014)] animate-pulse rounded-xl p-4">
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div className="h-10 bg-[var(--surface-soft,#161b20)] rounded" key={i} />
        ))}
      </div>
    </div>
  )
}

function CalendarSkeleton() {
  return (
    <div className="w-full bg-[var(--surface,#0d1014)] animate-pulse rounded-xl p-4 min-h-[400px]">
      <div className="grid grid-cols-7 gap-2">
        {[...Array(35)].map((_, i) => (
          <div className="h-12 bg-[var(--surface-soft,#161b20)] rounded" key={i} />
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// LAZY LOADED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AG Grid - ~500KB
 * Use: <LazyAgGrid {...props} />
 */
export const LazyAgGrid = dynamic(() => import('ag-grid-react').then((mod) => mod.AgGridReact), {
  ssr: false,
  loading: () => <TableSkeleton />,
})

/**
 * Framer Motion - ~150KB
 * Para animações complexas que não são necessárias no carregamento inicial
 */
export const LazyMotionDiv = dynamic(() => import('framer-motion').then((mod) => mod.motion.div), {
  ssr: false,
})

export const LazyMotionLi = dynamic(() => import('framer-motion').then((mod) => mod.motion.li), {
  ssr: false,
})

export const LazyAnimatePresence = dynamic(() => import('framer-motion').then((mod) => mod.AnimatePresence), {
  ssr: false,
})

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export { MapSkeleton, ChartSkeleton, TableSkeleton, CalendarSkeleton }
