import Link from 'next/link'
import { ChefHat, Radio } from 'lucide-react'
import {
  LAB_NUMERIC_SECTION_CLASS,
  LAB_RESPONSIVE_FOUR_UP_GRID,
  LabFactPill,
  LabMiniStat,
  LabPageHeader,
  LabPanel,
  LabSignalRow,
  LabStatusPill,
} from '@/components/design-lab/lab-primitives'
import type { ApiError } from '@/lib/api'
import type { OperationTimelineItem } from '@/lib/operations/operations-types'
import { formatMoney, formatShortTime } from '@/lib/operations/operations-visuals'
import { formatOperationalClock, type PdvOperationalMetric, resolvePdvAccessMessage } from './pdv-environment.model'

export function PdvOperationalHeader({
  dataUpdatedAt,
  description,
  eyebrow,
  isFetching,
  metrics,
  title,
}: Readonly<{
  dataUpdatedAt: number
  description: string
  eyebrow: string
  isFetching: boolean
  metrics: PdvOperationalMetric[]
  title: string
}>) {
  return (
    <header className="space-y-5 border-b border-[var(--lab-border)] pb-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] tracking-[0.08em] text-[var(--lab-fg-muted)]">{eyebrow}</p>
          <h1 className="text-[32px] font-normal tracking-[-0.03em] text-[var(--lab-fg)] sm:text-[40px]">{title}</h1>
          <p className="max-w-2xl text-sm text-[var(--lab-fg-soft)]">{description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <LabStatusPill icon={<Radio className="size-3" />} tone={isFetching ? 'info' : 'success'}>
            {isFetching ? 'Sincronizando' : 'Ao vivo'}
          </LabStatusPill>
          <p className="text-xs text-[var(--lab-fg-muted)]">
            Última atualização {formatOperationalClock(dataUpdatedAt)}
          </p>
        </div>
      </div>

      <div className={`grid gap-4 xl:gap-0 ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
        {metrics.map((metric, index) => (
          <div
            className={`min-w-0 py-1 xl:px-6 ${index > 0 ? 'xl:border-l xl:border-[var(--lab-border)]' : ''}`}
            key={metric.label}
          >
            <p className="text-[11px] tracking-[0.08em] text-[var(--lab-fg-muted)]">{metric.label}</p>
            <p
              className={`mt-2 ${LAB_NUMERIC_SECTION_CLASS} ${metric.muted ? 'text-[var(--lab-fg-muted)]' : 'text-[var(--lab-fg)]'}`}
            >
              {metric.value}
            </p>
            <p className="mt-2 text-xs text-[var(--lab-fg-soft)]">{metric.caption}</p>
          </div>
        ))}
      </div>
    </header>
  )
}

export function PdvLockedState({
  error,
  heading,
}: Readonly<{
  error: ApiError | null
  heading: {
    eyebrow: string
    title: string
    description: string
  }
}>) {
  const accessMessage = resolvePdvAccessMessage(error)

  return (
    <section className="space-y-6">
      <LabPageHeader
        description={heading.description}
        eyebrow={heading.eyebrow}
        meta={
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-3">
              <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">sessão</span>
              <LabStatusPill tone="warning">entrar</LabStatusPill>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-3">
              <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">modo</span>
              <LabStatusPill tone="info">pdv</LabStatusPill>
            </div>
            <p className="text-xs leading-5 text-[var(--lab-fg-soft)]">{accessMessage}</p>
          </div>
        }
        title={heading.title}
      >
        <div className={`grid gap-3 ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
          <LabMiniStat label="comandas abertas" value="0" />
          <LabMiniStat label="em aberto" value="R$ 0,00" />
          <LabMiniStat label="mesas ocupadas" value="0" />
          <LabMiniStat label="produtos ativos" value="0" />
        </div>
      </LabPageHeader>

      <LabPanel
        action={
          <Link
            className="inline-flex h-9 items-center rounded-[8px] border border-[var(--lab-blue-border)] bg-[var(--lab-blue-soft)] px-3 text-sm font-medium text-[var(--lab-blue)] transition hover:bg-[var(--lab-surface-hover)]"
            href="/login"
          >
            Entrar
          </Link>
        }
        padding="md"
        title="PDV indisponível sem sessão"
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <div className="space-y-0">
            <LabSignalRow
              label="abrir comanda"
              note="libera mesa, cliente e inclusão de itens"
              tone="neutral"
              value="bloqueado"
            />
            <LabSignalRow label="cobrança" note="fechamento e repasse para caixa" tone="neutral" value="bloqueada" />
            <LabSignalRow label="cozinha" note="fila só aparece com operação viva" tone="neutral" value="bloqueada" />
            <LabSignalRow
              label="estoque"
              note="queda e alerta só entram com produto real"
              tone="neutral"
              value="bloqueado"
            />
          </div>

          <div className="flex flex-wrap gap-2 xl:content-start">
            <LabFactPill label="próximo passo" value="autenticar" />
            <LabFactPill label="superfície" value="pdv / comandas" />
            <LabFactPill label="origem" value="operação viva" />
          </div>
        </div>
      </LabPanel>
    </section>
  )
}

export function PdvKitchenQueuePanel({
  items,
  loading,
}: Readonly<{
  items: OperationTimelineItem[]
  loading: boolean
}>) {
  const sortedItems = [...items].sort((left, right) => new Date(right.start).getTime() - new Date(left.start).getTime())

  return (
    <LabPanel action={<ChefHat className="size-4 text-[var(--accent)]" />} padding="md" title="Fila de preparo">
      {loading ? (
        <div className="space-y-3 rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              className="h-10 animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--surface-muted)_46%,transparent)]"
              key={index}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedItems.length > 0 ? (
            sortedItems.map((item) => (
              <div
                className="grid gap-3 rounded-[8px] border border-[var(--border)] px-4 py-3 md:grid-cols-[120px_minmax(0,1fr)_140px_auto]"
                key={item.id}
              >
                <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  {formatShortTime(item.start)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">
                    Mesa {item.tableLabel} · {item.employeeName}
                  </p>
                </div>
                <div className="text-sm text-[var(--text-soft)]">{formatMoney(item.amount)}</div>
                <PdvStatusPill status={item.status} />
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--text-soft)]">Sem itens de cozinha no momento.</p>
          )}
        </div>
      )}
    </LabPanel>
  )
}

function PdvStatusPill({ status }: Readonly<{ status: OperationTimelineItem['status'] }>) {
  const copy = {
    open: { label: 'Aberta', tone: 'neutral' as const },
    in_preparation: { label: 'Preparo', tone: 'warning' as const },
    ready: { label: 'Pronta', tone: 'success' as const },
    closed: { label: 'Fechada', tone: 'info' as const },
  }[status]

  return <LabStatusPill tone={copy.tone}>{copy.label}</LabStatusPill>
}
