'use client'

import { memo, useMemo } from 'react'
import { MobileActiveTablesSection, MobileFreeTablesSection } from './mobile-table-grid.cards'
import {
  MobileTableGridBanner,
  MobileTableGridEmptyState,
  MobileTableGridLoader,
} from './mobile-table-grid.empty-state'
import { buildMobileTableSnapshot } from './mobile-table-grid.helpers'
import { MobileTableGridSummary } from './mobile-table-grid.summary'
import type { MobileTableGridProps } from './mobile-table-grid.types'

export const MobileTableGrid = memo(function MobileTableGrid({
  mesas,
  onSelectMesa,
  currentEmployeeId = null,
  isLoading = false,
  isOffline = false,
  errorMessage = null,
}: MobileTableGridProps) {
  const snapshot = useMemo(() => buildMobileTableSnapshot(mesas, currentEmployeeId), [currentEmployeeId, mesas])

  if (isLoading && mesas.length === 0) {
    return <MobileTableGridLoader />
  }

  if (mesas.length === 0) {
    return <MobileTableGridEmptyState errorMessage={errorMessage} isOffline={isOffline} />
  }

  return (
    <div className="p-3 pb-6 sm:p-4">
      <MobileTableGridBanner errorMessage={errorMessage} isOffline={isOffline} />
      <MobileTableGridSummary
        livres={snapshot.livres}
        mesas={mesas}
        ocupadas={snapshot.ocupadas}
        reservadas={snapshot.reservadas}
        suasMesas={snapshot.suasMesas}
      />
      <MobileFreeTablesSection livres={snapshot.livres} onSelectMesa={onSelectMesa} />
      <MobileActiveTablesSection
        currentEmployeeId={currentEmployeeId}
        ocupadas={snapshot.ocupadas}
        onSelectMesa={onSelectMesa}
      />
    </div>
  )
})
