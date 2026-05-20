import {
  LAB_RESPONSIVE_FOUR_UP_GRID,
  LabPanel,
  LabStatusPill,
  type LabStatusTone,
} from '@/components/design-lab/lab-primitives'
import { fmtBRL } from './salao'
import { getNextAction, getSectionTone, type SalaoStats } from './salao-environment.model'

export function SalaoLabPanels({ stats, totalMesas }: Readonly<{ stats: SalaoStats; totalMesas: number }>) {
  const nextAction = getNextAction(stats)

  return (
    <div className="grid gap-5 xl:grid-cols-[400px_minmax(0,1fr)] xl:items-start">
      <LabPanel
        action={<LabStatusPill tone="info">{totalMesas} mesas</LabStatusPill>}
        padding="md"
        title="Leitura do salão"
      >
        <div className="space-y-0">
          <SalaoSignalRow
            label="receita em aberto"
            note="valor vivo nas mesas ocupadas"
            tone="info"
            value={fmtBRL(stats.openRevenue)}
          />
          <SalaoSignalRow
            label="ocupação"
            note="pressão atual do salão"
            tone={getOccupancyTone(stats.occupiedRate)}
            value={`${stats.occupiedRate}%`}
          />
          <SalaoSignalRow
            label="ticket aberto"
            note="média por mesa ocupada"
            tone={stats.averageOpenTicket > 0 ? 'info' : 'neutral'}
            value={fmtBRL(stats.averageOpenTicket)}
          />
          <SalaoSignalRow
            label="atendentes"
            note="garçons com mesa em giro"
            tone={stats.activeWaiters > 0 ? 'success' : 'neutral'}
            value={String(stats.activeWaiters)}
          />
        </div>
      </LabPanel>

      <LabPanel
        action={<LabStatusPill tone="neutral">{stats.sectionStats.length} setores</LabStatusPill>}
        padding="md"
        title="Radar do salão"
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_280px]">
          <SalaoSectionSnapshot stats={stats} />
          <div className="space-y-4 border-t border-dashed border-[var(--lab-border)] pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
            <SalaoMetaRow
              label="ocupadas"
              tone={stats.occupiedMesas.length > 0 ? 'warning' : 'neutral'}
              value={String(stats.occupiedMesas.length)}
            />
            <SalaoMetaRow
              label="reservadas"
              tone={stats.reservedMesas.length > 0 ? 'info' : 'neutral'}
              value={String(stats.reservedMesas.length)}
            />
            <SalaoMetaRow
              label="livres"
              tone={stats.freeMesas.length > 0 ? 'success' : 'warning'}
              value={String(stats.freeMesas.length)}
            />
            <SalaoMetaRow label="próxima ação" tone={nextAction.tone} value={nextAction.value} />
          </div>
        </div>
      </LabPanel>
    </div>
  )
}

export function SalaoMetaRow({
  label,
  tone,
  value,
}: Readonly<{
  label: string
  tone: LabStatusTone
  value: string
}>) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-3 last:border-b-0 last:pb-0">
      <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">{label}</span>
      <LabStatusPill tone={tone}>{value}</LabStatusPill>
    </div>
  )
}

function SalaoSectionSnapshot({ stats }: Readonly<{ stats: SalaoStats }>) {
  return (
    <div className="space-y-5">
      <div className={`grid gap-3 ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
        <SalaoMiniStat label="ocupadas" value={String(stats.occupiedMesas.length)} />
        <SalaoMiniStat label="livres" value={String(stats.freeMesas.length)} />
        <SalaoMiniStat label="reservas" value={String(stats.reservedMesas.length)} />
        <SalaoMiniStat label="setor líder" value={stats.sectionStats[0]?.label ?? 'sem leitura'} />
      </div>

      {stats.sectionStats.length > 0 ? <SalaoSectionRows stats={stats} /> : null}
    </div>
  )
}

function SalaoSectionRows({ stats }: Readonly<{ stats: SalaoStats }>) {
  return (
    <div className="space-y-1">
      {stats.sectionStats.slice(0, 4).map((section) => (
        <div
          className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] px-1 py-4 last:border-b-0"
          key={section.label}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--lab-fg)]">{section.label}</p>
            <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">
              {section.occupied}/{section.total} ocupadas
            </p>
          </div>
          <LabStatusPill tone={getSectionTone(section)}>{section.occupancy}%</LabStatusPill>
        </div>
      ))}
    </div>
  )
}

function SalaoSignalRow({
  label,
  note,
  tone,
  value,
}: Readonly<{
  label: string
  note: string
  tone: LabStatusTone
  value: string
}>) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] px-1 py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--lab-fg)]">{label}</p>
        <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{note}</p>
      </div>
      <LabStatusPill tone={tone}>{value}</LabStatusPill>
    </div>
  )
}

function SalaoMiniStat({
  label,
  value,
}: Readonly<{
  label: string
  value: string
}>) {
  return (
    <div className="rounded-[18px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[var(--lab-fg)]">{value}</p>
    </div>
  )
}

function getOccupancyTone(occupiedRate: number): LabStatusTone {
  if (occupiedRate >= 75) {
    return 'danger'
  }

  return occupiedRate >= 40 ? 'warning' : 'success'
}
