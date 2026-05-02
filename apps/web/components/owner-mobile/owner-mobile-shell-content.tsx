'use client'

import dynamic from 'next/dynamic'
import { SettingsEnvironment } from '@/components/dashboard/environments/settings-environment'
import type { DashboardSectionId } from '@/components/dashboard/dashboard-navigation'
import { normalizeTableLabel } from '@/components/pdv/normalize-table-label'
import { OwnerCashView } from './owner-cash-view'
import { OwnerFinanceView } from './owner-finance-view'
import { buildOwnerMobileFullLabHref } from './owner-mobile-links'
import { OwnerPdvTab } from './owner-mobile-pdv-tab'
import { OwnerTodayView } from './owner-today-view'
import type { OwnerMobileShellController } from './use-owner-mobile-shell-controller'

const OwnerComandasView = dynamic(() => import('./owner-comandas-view').then((mod) => mod.OwnerComandasView), {
  ssr: false,
})

const OWNER_QUICK_REGISTER_HREF = '/app/owner/cadastro-rapido'
const FULL_DASHBOARD_HREF = buildOwnerMobileFullLabHref('/design-lab/overview')
const FULL_CASH_HREF = buildOwnerMobileFullLabHref('/design-lab/caixa')
const FULL_FINANCE_HREF = buildOwnerMobileFullLabHref('/design-lab/financeiro')

function openFullLabSurface(href: string) {
  window.location.assign(href)
}

function OwnerTodayPanel({ controller }: Readonly<{ controller: OwnerMobileShellController }>) {
  return (
    <OwnerTodayView
      activeComandas={controller.executiveKpis.openComandasCount}
      errorMessage={controller.todayErrorMessage}
      garconRanking={controller.garconRanking}
      garconSnapshots={controller.garconSnapshots}
      isLoading={
        controller.ordersLoading ||
        controller.operationsLoading ||
        controller.kitchenLoading ||
        controller.summaryLoading
      }
      isOffline={controller.isOffline}
      kitchenBadge={controller.kitchenBadge}
      mesasLivres={controller.mesasLivres}
      mesasOcupadas={controller.mesasOcupadas}
      ticketMedio={controller.ticketMedio}
      todayOrderCount={controller.todayOrderCount}
      todayRevenue={controller.executiveKpis.receitaRealizada}
      topProdutos={controller.topProdutos}
      onOpenCash={() => {
        controller.setFocusedComandaId(null)
        controller.setPendingAction(null)
        controller.setActiveTab('caixa')
      }}
      onOpenComandas={() => {
        controller.setFocusedComandaId(null)
        controller.setPendingAction(null)
        controller.setActiveTab('comandas')
      }}
      onOpenFullDashboard={() => openFullLabSurface(FULL_DASHBOARD_HREF)}
      onOpenKitchen={() => {
        controller.setPendingAction(null)
        controller.setPdvView('cozinha')
        controller.setActiveTab('pdv')
      }}
      onOpenPdv={() => {
        controller.setFocusedComandaId(null)
        controller.setPendingAction(null)
        controller.setPdvView('mesas')
        controller.setActiveTab('pdv')
      }}
      onOpenQuickRegister={() => controller.router.push(OWNER_QUICK_REGISTER_HREF)}
    />
  )
}

function OwnerPdvPanel({ controller }: Readonly<{ controller: OwnerMobileShellController }>) {
  return (
    <OwnerPdvTab
      errorMessage={controller.pdvErrorMessage}
      isBusy={controller.isBusy}
      isOffline={controller.isOffline}
      kitchenData={controller.kitchenQuery.data}
      kitchenLoading={controller.kitchenLoading}
      mesas={controller.mesas}
      mesasLoading={controller.operationsLoading}
      pdvView={controller.pdvView}
      pendingAction={controller.pendingAction}
      products={controller.productsQuery.data?.items ?? []}
      productsErrorMessage={controller.productsErrorMessage}
      productsLoading={controller.productsLoading}
      onCancelBuilder={() => {
        controller.setPendingAction(null)
        controller.setPdvView('mesas')
      }}
      onOpenQuickRegister={() => controller.router.push(OWNER_QUICK_REGISTER_HREF)}
      onSelectMesa={(mesa) => {
        if (mesa.status === 'ocupada' && mesa.comandaId) {
          controller.setPendingAction(null)
          controller.setFocusedComandaId(mesa.comandaId)
          controller.setActiveTab('comandas')
          return
        }

        controller.setPendingAction({ type: 'new', mesa })
        controller.setFocusedComandaId(null)
        controller.setPdvView('mesas')
        controller.setActiveTab('pdv')
      }}
      onSetPdvView={controller.setPdvView}
      onSubmit={controller.handleSubmit}
    />
  )
}

function OwnerComandasPanel({ controller }: Readonly<{ controller: OwnerMobileShellController }>) {
  return (
    <OwnerComandasView
      comandas={controller.comandas}
      errorMessage={controller.operationsErrorMessage}
      focusedId={controller.focusedComandaId}
      isBusy={controller.isBusy}
      isLoading={controller.operationsLoading}
      isOffline={controller.isOffline}
      onAddItems={(comanda) => {
        controller.setPendingAction({
          type: 'edit',
          comanda,
          comandaId: comanda.id,
          mesaLabel: comanda.mesa ? normalizeTableLabel(comanda.mesa) : 'Comanda',
        })
        controller.setPdvView('mesas')
        controller.setActiveTab('pdv')
      }}
      onCloseComanda={(comandaId, discountAmount, serviceFeeAmount, paymentMethod) =>
        controller.closeComandaMutation.mutateAsync({ comandaId, discountAmount, serviceFeeAmount, paymentMethod })
      }
      onCreatePayment={(comandaId, amount, method) =>
        controller.createComandaPaymentMutation.mutateAsync({ comandaId, amount, method })
      }
    />
  )
}

function OwnerCashPanel({ controller }: Readonly<{ controller: OwnerMobileShellController }>) {
  return (
    <OwnerCashView
      data={controller.operationsQuery.data}
      errorMessage={controller.operationsErrorMessage}
      isBusy={controller.openCashSessionMutation.isPending}
      isLoading={controller.operationsLoading}
      isOffline={controller.isOffline}
      onOpenCash={() => controller.openCashSessionMutation.mutate(0)}
      onOpenFullCash={() => openFullLabSurface(FULL_CASH_HREF)}
    />
  )
}

function OwnerFinancePanel({ controller }: Readonly<{ controller: OwnerMobileShellController }>) {
  return (
    <OwnerFinanceView
      caixaEsperado={controller.executiveKpis.caixaEsperado}
      categoryBreakdown={controller.financeQuery.data?.categoryBreakdown ?? []}
      displayCurrency={controller.financeQuery.data?.displayCurrency ?? 'BRL'}
      errorMessage={controller.financeErrorMessage}
      financeSummary={controller.financeQuery.data}
      isOffline={controller.isOffline}
      lucroRealizado={controller.executiveKpis.lucroRealizado}
      ticketMedio={controller.ticketMedio}
      todayOrderCount={controller.todayOrderCount}
      todayRevenue={controller.executiveKpis.receitaRealizada}
      onOpenCash={() => openFullLabSurface(FULL_CASH_HREF)}
      onOpenFinanceiro={() => openFullLabSurface(FULL_FINANCE_HREF)}
    />
  )
}

function navigateOwnerMobileSection(controller: OwnerMobileShellController, sectionId: DashboardSectionId) {
  controller.setFocusedComandaId(null)
  controller.setPendingAction(null)

  if (sectionId === 'settings') {
    controller.setActiveTab('conta')
    return
  }

  if (sectionId === 'financeiro' || sectionId === 'map') {
    controller.setActiveTab('financeiro')
    return
  }

  if (sectionId === 'pdv' || sectionId === 'portfolio' || sectionId === 'salao') {
    controller.setPdvView('mesas')
    controller.setActiveTab('pdv')
    return
  }

  if (sectionId === 'pedidos') {
    controller.setActiveTab('comandas')
    return
  }

  controller.setActiveTab('today')
}

function OwnerAccountPanel({ controller }: Readonly<{ controller: OwnerMobileShellController }>) {
  return (
    <div className="space-y-4 p-3 pb-[8.5rem]">
      <SettingsEnvironment
        activeSettingsSection={controller.activeSettingsSection}
        presentation="legacy"
        onNavigateSection={(sectionId) => navigateOwnerMobileSection(controller, sectionId)}
        onSettingsSectionChange={controller.navigateSettingsSection}
      />
      <button
        className="w-full rounded-[18px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition active:bg-[var(--surface-muted)]"
        type="button"
        onClick={() => openFullLabSurface(FULL_DASHBOARD_HREF)}
      >
        Abrir painel completo
      </button>
    </div>
  )
}

type OwnerMobileShellContentProps = Readonly<{ controller: OwnerMobileShellController }>

export function OwnerMobileShellContent({ controller }: OwnerMobileShellContentProps) {
  if (controller.activeTab === 'today') {
    return <OwnerTodayPanel controller={controller} />
  }
  if (controller.activeTab === 'pdv') {
    return <OwnerPdvPanel controller={controller} />
  }
  if (controller.activeTab === 'comandas') {
    return <OwnerComandasPanel controller={controller} />
  }
  if (controller.activeTab === 'caixa') {
    return <OwnerCashPanel controller={controller} />
  }
  if (controller.activeTab === 'financeiro') {
    return <OwnerFinancePanel controller={controller} />
  }
  return <OwnerAccountPanel controller={controller} />
}
