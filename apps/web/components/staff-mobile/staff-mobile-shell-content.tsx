'use client'

import dynamic from 'next/dynamic'
import { ShoppingCart } from 'lucide-react'
import { MobileTableGrid } from './mobile-table-grid'
import type { StaffMobileShellViewModel } from './use-staff-mobile-shell-controller'
import { OPERATIONS_KITCHEN_QUERY_KEY } from '@/lib/operations'

const KitchenOrdersView = dynamic(() => import('./kitchen-orders-view').then((mod) => mod.KitchenOrdersView), {
  ssr: false,
})
const MobileComandaList = dynamic(() => import('./mobile-comanda-list').then((mod) => mod.MobileComandaList), {
  ssr: false,
})
const MobileOrderBuilder = dynamic(() => import('./mobile-order-builder').then((mod) => mod.MobileOrderBuilder), {
  ssr: false,
})
const MobileHistoricoView = dynamic(
  () => import('@/components/staff-mobile/mobile-historico-view').then((mod) => mod.MobileHistoricoView),
  { ssr: false },
)

function MesasTabContent({ controller }: { controller: StaffMobileShellViewModel }) {
  return (
    <MobileTableGrid
      currentEmployeeId={controller.currentEmployeeId}
      errorMessage={controller.operationsErrorMessage}
      isLoading={controller.operationsLoading}
      isOffline={controller.isOffline}
      mesas={controller.mesas}
      onSelectMesa={controller.handleSelectMesa}
    />
  )
}

function CozinhaTabContent({ controller }: { controller: StaffMobileShellViewModel }) {
  return (
    <KitchenOrdersView
      currentEmployeeId={controller.currentEmployeeId}
      data={controller.kitchenQuery.data}
      errorMessage={controller.kitchenErrorMessage}
      isLoading={controller.kitchenLoading}
      isOffline={controller.isOffline}
      queryKey={OPERATIONS_KITCHEN_QUERY_KEY}
    />
  )
}

function PedidoTabContent({ controller }: { controller: StaffMobileShellViewModel }) {
  if (!controller.pendingAction) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <ShoppingCart className="size-7 text-[var(--text-soft)]" />
        </div>
        <p className="text-sm font-medium text-[var(--text-primary)]">Selecione uma mesa primeiro</p>
        <p className="mt-1 text-xs text-[var(--text-soft)]">
          Vá para a aba Mesas e toque em uma mesa para criar um pedido
        </p>
        <button
          className="mt-6 rounded-xl bg-[rgba(0,140,255,0.15)] px-5 py-2.5 text-sm font-semibold text-[var(--accent,#008cff)] transition-opacity active:opacity-70"
          type="button"
          onClick={() => controller.setActiveTab('mesas')}
        >
          Ver mesas
        </button>
      </div>
    )
  }

  return (
    <MobileOrderBuilder
      busy={controller.isBusy}
      errorMessage={controller.productsErrorMessage}
      initialItems={controller.pendingAction.type === 'edit' ? controller.pendingAction.comanda.itens : undefined}
      isLoading={controller.productsLoading}
      isOffline={controller.isOffline}
      mesaLabel={controller.mesaLabel}
      mode={controller.orderMode}
      produtos={controller.productsQuery.data?.items ?? []}
      summaryItems={controller.summaryItems}
      onCancel={() => {
        controller.setPendingAction(null)
        controller.setFocusedComandaId(null)
        controller.setActiveTab('mesas')
      }}
      onSubmit={controller.handleSubmit}
    />
  )
}

function PedidosTabContent({ controller }: { controller: StaffMobileShellViewModel }) {
  return (
    <MobileComandaList
      comandas={controller.activeComandas}
      currentEmployeeId={controller.currentEmployeeId}
      errorMessage={controller.operationsErrorMessage}
      focusedId={controller.focusedComandaId}
      isBusy={controller.isBusy}
      isLoading={controller.operationsLoading}
      isOffline={controller.isOffline}
      summary={{
        activeCount: controller.activeComandas.length,
        preparingCount: controller.activeComandas.filter((comanda) => comanda.status === 'em_preparo').length,
        readyCount: controller.activeComandas.filter((comanda) => comanda.status === 'pronta').length,
      }}
      onAddItems={controller.handleAddItemsToComanda}
      onCancelComanda={controller.handleCancel}
      onCloseComanda={controller.handleCloseWithDiscount}
      onCreatePayment={controller.handleCreatePayment}
      onFocus={controller.setFocusedComandaId}
      onNewComanda={controller.handleNewComanda}
      onUpdateStatus={controller.handleUpdateStatus}
    />
  )
}

function HistoricoTabContent({ controller }: { controller: StaffMobileShellViewModel }) {
  return (
    <MobileHistoricoView
      comandas={controller.historicoComandas}
      summary={{
        receitaRealizada: controller.performerKpis.receitaRealizada,
        receitaEsperada: controller.performerKpis.receitaEsperada,
        openComandasCount: controller.performerKpis.openComandasCount,
        ranking: controller.performerStanding,
      }}
    />
  )
}

export function StaffMobileShellContent({ controller }: { controller: StaffMobileShellViewModel }) {
  if (controller.activeTab === 'mesas') {
    return <MesasTabContent controller={controller} />
  }

  if (controller.activeTab === 'cozinha') {
    return <CozinhaTabContent controller={controller} />
  }

  if (controller.activeTab === 'pedido') {
    return <PedidoTabContent controller={controller} />
  }

  if (controller.activeTab === 'pedidos') {
    return <PedidosTabContent controller={controller} />
  }

  if (controller.activeTab === 'historico') {
    return <HistoricoTabContent controller={controller} />
  }

  return null
}
