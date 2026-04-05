'use client'

import { useMemo } from 'react'
import { CalendarRange, Clock3, Layers3, ShieldCheck, UserRound, type LucideIcon } from 'lucide-react'
import type { OperationTimelineItem, OperationTimelineResource } from '@/lib/operations/operations-types'
import {
  buildTimelineTicks,
  buildTimelineWindow,
  formatMoney,
  formatShortTime,
  getCashSessionTone,
  getComandaTone,
  getTimelinePlacement,
  groupItemsByResource,
} from '@/lib/operations/operations-visuals'

export function OperationsTimeline({
  resources,
  items,
  title = 'Linha do tempo operacional',
  description = 'Visão manual por equipe e mesa, desenhada para leitura rápida sem a camada pesada do calendário externo.',
}: Readonly<{
  resources: OperationTimelineResource[]
  items: OperationTimelineItem[]
  title?: string
  description?: string
  onEventDrop?: (info: { id: string; start: Date; end: Date; resourceId?: string }) => void
  onEventResize?: (info: { id: string; start: Date; end: Date }) => void
}>) {
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
  const openItems = items.filter((item) => item.status !== 'closed').length
  const window = useMemo(() => buildTimelineWindow(items), [items])
  const ticks = useMemo(() => buildTimelineTicks(window), [window])
  const grouped = useMemo(() => groupItemsByResource(resources, items), [resources, items])
  const laneMinWidth = Math.max(920, Math.max(ticks.length, 1) * 132)

  return (
    <section className="imperial-card p-6 md:p-7">
      <header className="flex flex-col gap-4 border-b border-white/6 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Operação ao vivo</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">{description}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[640px]">
          <MiniStat icon={UserRound} label="Recursos" value={String(resources.length)} />
          <MiniStat icon={Layers3} label="Blocos" value={String(items.length)} />
          <MiniStat icon={ShieldCheck} label="Abertos" value={String(openItems)} />
          <MiniStat icon={Clock3} label="Total" value={formatMoney(totalAmount)} />
        </div>
      </header>

      <div className="mt-5 rounded-[28px] border border-white/6 bg-[rgba(255,255,255,0.02)] p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/6 pb-4">
          <div className="flex items-center gap-2 text-sm text-[var(--text-soft)]">
            <CalendarRange className="size-4" />
            Timeline manual do salão por equipe e janela do dia
          </div>
          <div className="rounded-full border border-[rgba(52,242,127,0.18)] bg-[rgba(52,242,127,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8fffb9]">
            Sem dependência visual externa
          </div>
        </div>

        {resources.length ? (
          <div className="overflow-x-auto">
            <div className="min-w-[1180px]">
              <div className="grid grid-cols-[240px_minmax(0,1fr)] gap-3 pb-3">
                <div className="rounded-[18px] border border-white/6 bg-[rgba(255,255,255,0.02)] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                    Equipe / caixa
                  </p>
                </div>

                <div
                  className="grid gap-0 rounded-[18px] border border-white/6 bg-[rgba(255,255,255,0.02)]"
                  style={{ minWidth: laneMinWidth, gridTemplateColumns: `repeat(${ticks.length}, minmax(0, 1fr))` }}
                >
                  {ticks.map((tick, index) => (
                    <div
                      className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]"
                      key={tick.key}
                      style={{
                        borderLeft: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      {tick.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {grouped.map(({ resource, items: resourceItems }) => {
                  const tone = getCashSessionTone(resource.status)
                  return (
                    <div className="grid grid-cols-[240px_minmax(0,1fr)] gap-3" key={resource.id}>
                      <div className="rounded-[22px] border border-white/6 bg-[rgba(255,255,255,0.02)] px-4 py-4">
                        <p className="truncate text-sm font-semibold text-white">{resource.title}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${tone.className}`}
                          >
                            {tone.label}
                          </span>
                          {resource.subtitle ? (
                            <span className="truncate text-[11px] text-[var(--text-soft)]">{resource.subtitle}</span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-xs leading-6 text-[var(--text-soft)]">
                          {resourceItems.length
                            ? `${resourceItems.length} atendimento(s) na janela atual.`
                            : 'Sem movimentação nesta janela.'}
                        </p>
                      </div>

                      <div
                        className="relative rounded-[22px] border border-white/6 bg-[rgba(255,255,255,0.02)]"
                        style={{ minWidth: laneMinWidth, minHeight: 96 }}
                      >
                        <div className="absolute inset-0 overflow-hidden rounded-[22px]">
                          <div
                            className="grid h-full"
                            style={{ gridTemplateColumns: `repeat(${ticks.length}, minmax(0, 1fr))` }}
                          >
                            {ticks.map((tick, index) => (
                              <div
                                key={tick.key}
                                style={{
                                  borderLeft: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                }}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="relative px-3 py-3">
                          {resourceItems.length ? (
                            resourceItems.map((item) => {
                              const placement = getTimelinePlacement(window, item)
                              const itemTone = getComandaTone(item.status)

                              return (
                                <div
                                  className="absolute top-3 rounded-[16px] border border-white/8 bg-[rgba(13,17,23,0.88)] px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.22)]"
                                  key={item.id}
                                  style={{
                                    left: `calc(${placement.left}% + 8px)`,
                                    width: `calc(${placement.width}% - 12px)`,
                                    minWidth: 148,
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <span
                                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${itemTone.className}`}
                                    >
                                      {itemTone.label}
                                    </span>
                                    <span className="text-[11px] text-[var(--text-soft)]">
                                      {formatMoney(item.amount)}
                                    </span>
                                  </div>
                                  <p className="mt-2 truncate text-sm font-semibold text-white">{item.title}</p>
                                  <p className="truncate text-xs text-[var(--text-soft)]">
                                    Mesa {item.tableLabel} · {item.employeeName}
                                  </p>
                                  <p className="mt-2 text-[11px] text-[var(--text-soft)]">
                                    {formatShortTime(item.start)} — {formatShortTime(item.end)}
                                  </p>
                                </div>
                              )
                            })
                          ) : (
                            <div className="flex min-h-[70px] items-center justify-center text-sm text-[var(--text-soft)]">
                              Sem blocos nessa faixa.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[320px] items-center justify-center rounded-[24px] border border-dashed border-white/8 bg-[rgba(255,255,255,0.02)]">
            <div className="max-w-md text-center">
              <Layers3 className="mx-auto size-10 text-[var(--text-soft)]/70" />
              <p className="mt-4 text-sm font-medium text-white">Nenhum recurso carregado ainda.</p>
              <p className="mt-2 text-sm text-[var(--text-soft)]">
                Assim que os dados vierem do banco, esta agenda manual passa a refletir a equipe e as mesas.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: Readonly<{
  icon: LucideIcon
  label: string
  value: string
}>) {
  return (
    <div className="rounded-[18px] border border-white/6 bg-[rgba(255,255,255,0.02)] px-4 py-3">
      <Icon className="size-4 text-[var(--text-soft)]" />
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}
