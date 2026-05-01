'use client'

import dynamic from 'next/dynamic'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { SettingsEnvironment } from './environments/settings-environment'
import type { DashboardSectionId, DashboardSettingsSectionId, DashboardTabId } from '@/components/dashboard/dashboard-navigation'
import type { AuthUser, EmployeeRecord } from '@/lib/api'
import type { PdvMesaIntent } from '@/components/pdv/pdv-navigation-intent'

// ── Medium-heavy environments — lazy loaded ────────────────────────────────────
// PdvWireframeEnvironment: compact dashboard PDV views aligned to the wireframe shell
const PdvWireframeEnvironment = dynamic(
  () => import('./environments/pdv-wireframe-environment').then((m) => m.PdvWireframeEnvironment),
  {
    loading: () => <EnvironmentSkeleton rows={5} />,
    ssr: false,
  },
)

// OverviewEnvironment: Recharts (~300 KB) via MetricCard + SalesPerformanceCard
const OverviewEnvironment = dynamic(
  () => import('./environments/overview-environment').then((m) => m.OverviewEnvironment),
  {
    loading: () => <EnvironmentSkeleton rows={4} />,
    ssr: false,
  },
)

// ── Heavy environments — lazy loaded only when the user navigates to them ──────
// CalendarioEnvironment: react-big-calendar (~180 KB)
const CalendarioEnvironment = dynamic(
  () => import('./environments/calendario-environment').then((m) => m.CalendarioEnvironment),
  {
    loading: () => <EnvironmentSkeleton rows={6} />,
    ssr: false,
  },
)

// SalaoEnvironment: floor-plan drag-and-drop via @dnd-kit (~41 KB component + dnd-kit)
const SalaoEnvironment = dynamic(() => import('./salao-environment').then((m) => m.SalaoEnvironment), {
  loading: () => <EnvironmentSkeleton rows={4} />,
  ssr: false,
})

const FinanceiroEnvironment = dynamic(
  () => import('./environments/financeiro-environment').then((m) => m.FinanceiroEnvironment),
  {
    loading: () => <EnvironmentSkeleton rows={5} />,
    ssr: false,
  },
)

const PedidosEnvironment = dynamic(
  () => import('./environments/pedidos-environment').then((m) => m.PedidosEnvironment),
  {
    loading: () => <EnvironmentSkeleton rows={5} />,
    ssr: false,
  },
)

const EquipeEnvironment = dynamic(
  () => import('./environments/equipe-environment').then((m) => m.EquipeEnvironment),
  {
    loading: () => <EnvironmentSkeleton rows={5} />,
    ssr: false,
  },
)

export type EnvironmentRenderProps = {
  activeSection: DashboardSectionId
  activeSettingsSection: DashboardSettingsSectionId
  activeTab: DashboardTabId | null
  employees: EmployeeRecord[]
  finance?: FinanceSummaryResponse
  onConsumePdvMesaIntent: () => void
  onOpenPdvFromMesa: (intent: Omit<PdvMesaIntent, 'requestId'>) => void
  onNavigateSection: (sectionId: DashboardSectionId) => void
  onSettingsSectionChange: (sectionId: DashboardSettingsSectionId) => void
  pdvMesaIntent: PdvMesaIntent | null
  user: AuthUser
}

export function renderActiveEnvironment(props: EnvironmentRenderProps) {
  switch (props.activeSection) {
    case 'financeiro':
      return <FinanceiroEnvironment activeTab={props.activeTab} />
    case 'pedidos':
      return <PedidosEnvironment activeTab={props.activeTab} />
    case 'sales':
      return <FinanceiroEnvironment activeTab="movimentacao" />
    case 'portfolio':
      return <PdvWireframeEnvironment mesaIntent={props.pdvMesaIntent} user={props.user} variant="grid" />
    case 'pdv':
      return (
        <PdvWireframeEnvironment
          mesaIntent={props.pdvMesaIntent}
          user={props.user}
          variant={
            props.activeTab === 'comandas' || props.activeTab === 'kds' || props.activeTab === 'cobranca'
              ? props.activeTab
              : 'grid'
          }
        />
      )
    case 'overview':
      return (
        <OverviewEnvironment
          variant={
            props.activeTab === 'layout' ||
            props.activeTab === 'meta' ||
            props.activeTab === 'operacional' ||
            props.activeTab === 'editorial'
              ? props.activeTab
              : 'principal'
          }
        />
      )
    case 'calendario':
      return <OverviewEnvironment variant="editorial" />
    case 'equipe':
      if (props.activeTab === 'escala') {
        return <CalendarioEnvironment />
      }
      return (
        <EquipeEnvironment
          activeTab={props.activeTab}
          employees={props.employees}
          finance={props.finance}
          userRole={props.user.role}
        />
      )
    case 'payroll':
      return (
        <EquipeEnvironment
          activeTab="folha"
          employees={props.employees}
          finance={props.finance}
          userRole={props.user.role}
        />
      )
    case 'salao':
      return (
        <SalaoEnvironment
          initialView={
            props.activeTab === 'planta'
              ? 'planta'
              : props.activeTab === 'permanencia'
                ? 'comandas'
                : props.activeTab === 'padroes'
                  ? 'configuracao'
                  : 'operacional'
          }
          onOpenPdvFromMesa={props.onOpenPdvFromMesa}
        />
      )
    case 'map':
      return <FinanceiroEnvironment activeTab="fluxo" />
    case 'settings':
      return (
        <SettingsEnvironment
          activeSettingsSection={props.activeSettingsSection}
          onNavigateSection={props.onNavigateSection}
          onSettingsSectionChange={props.onSettingsSectionChange}
        />
      )
    default:
      return <OverviewEnvironment variant="principal" />
  }
}

// ── Skeleton genérico para estados de loading dos ambientes pesados ────────────
function EnvironmentSkeleton({ rows = 4, tall = false }: { rows?: number; tall?: boolean }) {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="imperial-card p-6">
        <div className="skeleton-shimmer h-4 w-40 rounded-full" />
        <div className="skeleton-shimmer mt-3 h-3 w-64 rounded-full" />
      </div>
      {tall ? (
        <div className="imperial-card p-0 overflow-hidden">
          <div className="skeleton-shimmer h-[520px] w-full" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div className="imperial-card p-5" key={i}>
              <div className="skeleton-shimmer h-3 w-24 rounded-full" />
              <div className="skeleton-shimmer mt-4 h-8 w-32 rounded-xl" />
              <div className="skeleton-shimmer mt-3 h-3 w-20 rounded-full" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
