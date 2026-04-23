'use client'

import { useMemo, useState } from 'react'
import { buildTurnPriority, type OwnerTodayViewProps } from './owner-today-view-model'
import { OwnerTodayRadar } from './owner-today-view-radar'
import {
  OwnerTodayActions,
  OwnerTodayDashboardButton,
  OwnerTodayFootballWidget,
  OwnerTodayHero,
  OwnerTodayLiveMap,
  OwnerTodayStatusBanner,
} from './owner-today-view-sections'

export function OwnerTodayView(props: OwnerTodayViewProps) {
  const [selectedPerformer, setSelectedPerformer] = useState<string>('all')
  const priority = buildTurnPriority(props)
  const selectedPerformerSnapshot = useMemo(
    () => props.garconSnapshots.find((performer) => performer.nome === selectedPerformer) ?? null,
    [props.garconSnapshots, selectedPerformer],
  )

  return (
    <div className="space-y-4 p-3 pb-6">
      <OwnerTodayStatusBanner errorMessage={props.errorMessage} isOffline={props.isOffline} />
      <OwnerTodayHero
        activeComandas={props.activeComandas}
        isLoading={props.isLoading}
        kitchenBadge={props.kitchenBadge}
        priority={priority}
        ticketMedio={props.ticketMedio}
        todayOrderCount={props.todayOrderCount}
        todayRevenue={props.todayRevenue}
      />
      <OwnerTodayFootballWidget />
      <OwnerTodayActions
        onOpenComandas={props.onOpenComandas}
        onOpenKitchen={props.onOpenKitchen}
        onOpenPdv={props.onOpenPdv}
        onOpenQuickRegister={props.onOpenQuickRegister}
      />
      <OwnerTodayLiveMap
        kitchenBadge={props.kitchenBadge}
        mesasLivres={props.mesasLivres}
        mesasOcupadas={props.mesasOcupadas}
      />
      <OwnerTodayRadar
        garconRanking={props.garconRanking}
        garconSnapshots={props.garconSnapshots}
        selectedPerformer={selectedPerformer}
        selectedPerformerSnapshot={selectedPerformerSnapshot}
        setSelectedPerformer={setSelectedPerformer}
        topProdutos={props.topProdutos}
      />
      <OwnerTodayDashboardButton onOpenFullDashboard={props.onOpenFullDashboard} />
    </div>
  )
}
