'use client'

import { CalendarDays } from 'lucide-react'
import {
  buildOwnerTodayActions,
  buildOwnerTodayChips,
  buildOwnerTodayKpis,
  buildOwnerTodayLiveStats,
  getTodayLiveCaption,
  type OwnerTodayViewProps,
  type TurnPriority,
} from './owner-today-view-model'
import { VascoNextMatchWidget } from '@/components/shared/football-widgets'

export function OwnerTodayStatusBanner({
  errorMessage,
  isOffline,
}: Pick<OwnerTodayViewProps, 'errorMessage' | 'isOffline'>) {
  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-xs text-[#fca5a5]">
        {errorMessage}
      </div>
    )
  }

  if (isOffline) {
    return (
      <div className="rounded-2xl border border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.08)] px-4 py-3 text-xs text-[#fcd34d]">
        Você está offline. O resumo pode estar desatualizado até a reconexão.
      </div>
    )
  }

  return null
}

export function OwnerTodayHero({
  activeComandas,
  isLoading,
  kitchenBadge,
  priority,
  ticketMedio,
  todayOrderCount,
  todayRevenue,
}: {
  activeComandas: number
  isLoading: boolean
  kitchenBadge: number
  priority: TurnPriority
  ticketMedio: number
  todayOrderCount: number
  todayRevenue: number
}) {
  const chips = buildOwnerTodayChips({ activeComandas, kitchenBadge, todayOrderCount })
  const kpis = buildOwnerTodayKpis({ activeComandas, ticketMedio, todayOrderCount, todayRevenue })

  return (
    <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <OwnerTodayHeroHeader priority={priority} />
      <OwnerTodayHeroChips chips={chips} />
      <OwnerTodayHeroGrid isLoading={isLoading} kpis={kpis} />
    </section>
  )
}

function OwnerTodayHeroHeader({ priority }: { priority: TurnPriority }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">Hoje</p>
        <h1 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Operação do turno</h1>
        <p className="mt-1 text-sm leading-6 text-[var(--text-soft,#7a8896)]">{priority.headline}</p>
      </div>
      <span
        className="shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ background: priority.background, borderColor: priority.border, color: priority.color }}
      >
        {priority.label}
      </span>
    </div>
  )
}

function OwnerTodayHeroChips({ chips }: { chips: string[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {chips.map((label) => (
        <span
          className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-primary)]"
          key={label}
        >
          {label}
        </span>
      ))}
    </div>
  )
}

function OwnerTodayHeroGrid({ isLoading, kpis }: { isLoading: boolean; kpis: ReturnType<typeof buildOwnerTodayKpis> }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[18px] bg-[var(--border)]">
      {kpis.map(({ color, icon: Icon, key, label, sub, value }) => (
        <div className="bg-[var(--surface-muted)] px-3 py-3" data-testid={`owner-kpi-${key}`} key={key}>
          <div className="mb-1 flex items-center gap-1.5">
            <Icon className="size-3.5" style={{ color }} />
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">{label}</p>
          </div>
          {isLoading ? (
            <div className="h-6 w-20 animate-pulse rounded bg-[var(--surface-soft)]" />
          ) : (
            <p className="text-lg font-bold text-[var(--text-primary)]">{value}</p>
          )}
          <p className="mt-1 text-[10px] text-[var(--text-soft)]">{sub}</p>
        </div>
      ))}
    </div>
  )
}

export function OwnerTodayActions(
  props: Pick<
    OwnerTodayViewProps,
    'onOpenCash' | 'onOpenComandas' | 'onOpenKitchen' | 'onOpenPdv' | 'onOpenQuickRegister'
  >,
) {
  const actions = buildOwnerTodayActions(props)

  return (
    <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
          Ações do turno
        </p>
        <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">Primeiro operação, depois consulta completa.</p>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {actions.map(({ accent, icon: Icon, label, onClick, sub }) => (
          <button
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-[var(--surface-muted)]"
            key={label}
            type="button"
            onClick={onClick}
          >
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border"
              style={{ background: `${accent}14`, borderColor: `${accent}33`, color: accent }}
            >
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[var(--text-primary)]">{label}</span>
              <span className="mt-1 block text-[11px] leading-5 text-[var(--text-soft,#7a8896)]">{sub}</span>
            </span>
            <span className="text-xs font-semibold text-[var(--text-soft)]">Abrir</span>
          </button>
        ))}
      </div>
    </section>
  )
}

export function OwnerTodayFootballWidget() {
  return (
    <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
              Agenda esportiva
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">Próximo jogo do Vasco</p>
          </div>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--accent,#008cff)]">
            <CalendarDays className="size-4" />
          </span>
        </div>
      </div>

      <VascoNextMatchWidget className="rounded-none border-0 bg-transparent" />
    </section>
  )
}

export function OwnerTodayLiveMap({
  kitchenBadge,
  mesasLivres,
  mesasOcupadas,
}: Pick<OwnerTodayViewProps, 'kitchenBadge' | 'mesasLivres' | 'mesasOcupadas'>) {
  const stats = buildOwnerTodayLiveStats({ kitchenBadge, mesasLivres, mesasOcupadas })

  return (
    <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
            Ao vivo
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">Mapa rápido do turno</p>
        </div>
        <span className="text-[10px] text-[var(--text-soft)]">{getTodayLiveCaption(mesasOcupadas)}</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-[18px] bg-[var(--border)]">
        {stats.map(({ label, tone, value }) => (
          <div className="bg-[var(--surface-muted)] px-3 py-3 text-center" key={label}>
            <p className="text-2xl font-bold" style={{ color: tone }}>
              {value}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
              {label}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function OwnerTodayDashboardButton({ onOpenFullDashboard }: Pick<OwnerTodayViewProps, 'onOpenFullDashboard'>) {
  return (
    <button
      className="w-full rounded-2xl border border-[rgba(0,140,255,0.3)] bg-[rgba(0,140,255,0.08)] px-4 py-3 text-sm font-semibold text-[var(--accent,#008cff)] transition-opacity active:opacity-70"
      type="button"
      onClick={onOpenFullDashboard}
    >
      Painel completo →
    </button>
  )
}
