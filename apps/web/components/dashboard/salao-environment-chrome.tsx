import { Armchair, ClipboardList, Grid3X3, List, type LucideIcon, Plus, Zap } from 'lucide-react'
import { DashboardSectionHeading } from '@/components/dashboard/dashboard-section-heading'
import { LAB_RESPONSIVE_FOUR_UP_GRID, LabMiniStat, LabPageHeader } from '@/components/design-lab/lab-primitives'
import { fmtBRL, KpiCard, type View } from './salao'
import type { SalaoStats } from './salao-environment.model'
import { SalaoMetaRow } from './salao-lab-panels'

type SalaoTab = {
  icon: LucideIcon
  id: View
  label: string
}

const SALAO_TABS: SalaoTab[] = [
  { id: 'operacional', label: 'Operacional', icon: Zap },
  { id: 'comandas', label: 'Comandas', icon: ClipboardList },
  { id: 'configuracao', label: 'Configuração', icon: List },
  { id: 'planta', label: 'Planta baixa', icon: Grid3X3 },
]

export function SalaoHeader({ stats, surface }: Readonly<{ stats: SalaoStats; surface: 'legacy' | 'lab' }>) {
  if (surface === 'lab') {
    return <SalaoLabHeader stats={stats} />
  }

  return (
    <DashboardSectionHeading
      description="Ocupação, comandas e giro de mesas."
      eyebrow="Gestão do salão"
      icon={Armchair}
      title="Salão"
    />
  )
}

export function LegacySalaoKpis({ stats, totalMesas }: Readonly<{ stats: SalaoStats; totalMesas: number }>) {
  return (
    <div className={`grid gap-4 ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
      <KpiCard isHighlight label="Receita em aberto" tone="accent" value={fmtBRL(stats.openRevenue)} />
      <KpiCard label="Mesas livres" tone="success" total={totalMesas} value={stats.freeMesas.length} />
      <KpiCard label="Ticket aberto" tone="warning" value={fmtBRL(stats.averageOpenTicket)} />
      <KpiCard label="Ocupação" tone="danger" value={`${stats.occupiedRate}%`} />
    </div>
  )
}

export function SalaoTopBar({
  onCreate,
  onViewChange,
  stats,
  view,
}: Readonly<{
  onCreate: () => void
  onViewChange: (view: View) => void
  stats: SalaoStats
  view: View
}>) {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <SalaoTabs view={view} onViewChange={onViewChange} />
      <SalaoQuickStats stats={stats} view={view} onCreate={onCreate} />
    </div>
  )
}

function SalaoLabHeader({ stats }: Readonly<{ stats: SalaoStats }>) {
  return (
    <LabPageHeader
      description="Ocupação, receita e giro de mesas."
      eyebrow="Gestão do salão"
      meta={
        <div className="space-y-3">
          <SalaoMetaRow
            label="mesas ativas"
            tone="info"
            value={String(stats.freeMesas.length + stats.occupiedMesas.length)}
          />
          <SalaoMetaRow
            label="ocupadas"
            tone={stats.occupiedMesas.length > 0 ? 'warning' : 'neutral'}
            value={String(stats.occupiedMesas.length)}
          />
          <SalaoMetaRow
            label="atendentes"
            tone={stats.activeWaiters > 0 ? 'success' : 'neutral'}
            value={String(stats.activeWaiters)}
          />
        </div>
      }
      title="Salão"
    >
      <div className={`grid gap-3 ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
        <LabMiniStat label="receita aberta" value={fmtBRL(stats.openRevenue)} />
        <LabMiniStat label="livres" value={String(stats.freeMesas.length)} />
        <LabMiniStat label="ticket aberto" value={fmtBRL(stats.averageOpenTicket)} />
        <LabMiniStat label="ocupação" value={`${stats.occupiedRate}%`} />
      </div>
    </LabPageHeader>
  )
}

function SalaoTabs({ onViewChange, view }: Readonly<{ onViewChange: (view: View) => void; view: View }>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {SALAO_TABS.map((tab) => (
        <SalaoTabButton isActive={view === tab.id} key={tab.id} tab={tab} onClick={() => onViewChange(tab.id)} />
      ))}
    </div>
  )
}

function SalaoTabButton({
  isActive,
  onClick,
  tab,
}: Readonly<{
  isActive: boolean
  onClick: () => void
  tab: SalaoTab
}>) {
  const Icon = tab.icon

  return (
    <button
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        isActive
          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-soft)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]'
      }`}
      type="button"
      onClick={onClick}
    >
      <Icon className="size-4" />
      {tab.label}
    </button>
  )
}

function SalaoQuickStats({
  onCreate,
  stats,
  view,
}: Readonly<{
  onCreate: () => void
  stats: SalaoStats
  view: View
}>) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
      <QuickStatPill value={`${stats.activeWaiters} atendentes em giro`} />
      <QuickStatPill value={`${stats.reservedMesas.length} reservas`} />
      {view === 'configuracao' ? <NewMesaButton onClick={onCreate} /> : null}
    </div>
  )
}

function QuickStatPill({ value }: Readonly<{ value: string }>) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1.5">
      {value}
    </span>
  )
}

function NewMesaButton({ onClick }: Readonly<{ onClick: () => void }>) {
  return (
    <button
      className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent-strong)] hover:bg-[var(--surface-soft)]"
      type="button"
      onClick={onClick}
    >
      <Plus className="size-4" />
      Nova mesa
    </button>
  )
}
