'use client'

import { useCallback, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { formatBRL as formatCurrency } from '@/lib/currency'
import { calcTotal, type Comanda } from './pdv-types'
import { resolveHistoricoResponsavel } from './pdv-historico-view.model'

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  aberta: { label: 'Aberta', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  em_preparo: { label: 'Em preparo', color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  pronta: { label: 'Pronta', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  cancelada: { label: 'Cancelada', color: '#f87171', bg: 'rgba(248,113,113,0.16)' },
  fechada: { label: 'Paga', color: '#36f57c', bg: 'rgba(54,245,124,0.12)' },
}

function formatDateTime(date: Date) {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  })
}

export function HistoricoCard({ comanda }: Readonly<{ comanda: Comanda }>) {
  const [open, setOpen] = useState(false)
  const details = buildHistoricoCardDetails(comanda)
  const handleToggle = useCallback(() => {
    setOpen((value) => !value)
  }, [])

  return (
    <li className="overflow-hidden rounded-[18px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)]">
      <HistoricoCardButton comanda={comanda} details={details} open={open} onToggle={handleToggle} />
      {open ? <HistoricoCardBody comanda={comanda} details={details} /> : null}
    </li>
  )
}

function HistoricoCardButton({
  comanda,
  details,
  open,
  onToggle,
}: Readonly<{
  comanda: Comanda
  details: ReturnType<typeof buildHistoricoCardDetails>
  open: boolean
  onToggle: () => void
}>) {
  return (
    <button
      className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[rgba(255,255,255,0.03)]"
      type="button"
      onClick={onToggle}
    >
      <HistoricoCardTitle comanda={comanda} details={details} />
      <HistoricoCardTotal details={details} open={open} />
    </button>
  )
}

function HistoricoCardTitle({
  comanda,
  details,
}: Readonly<{ comanda: Comanda; details: ReturnType<typeof buildHistoricoCardDetails> }>) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-base font-semibold text-[var(--text-primary)]">Mesa {comanda.mesa ?? '—'}</p>
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={details.badgeStyle}
        >
          {details.badge.label}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-soft)]">
        <span>{formatDateTime(comanda.abertaEm)}</span>
        <span>{details.totalItens} itens</span>
        <span>{details.responsavelLabel}</span>
        {comanda.clienteNome ? <span>Cliente: {comanda.clienteNome}</span> : null}
      </div>
    </div>
  )
}

function HistoricoCardTotal({
  details,
  open,
}: Readonly<{ details: ReturnType<typeof buildHistoricoCardDetails>; open: boolean }>) {
  const Icon = open ? ChevronDown : ChevronRight
  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-sm font-bold" style={details.totalStyle}>
          {formatCurrency(details.total)}
        </p>
      </div>
      <Icon className="size-4 text-[var(--text-soft)]" />
    </div>
  )
}

function HistoricoCardBody({
  comanda,
  details,
}: Readonly<{ comanda: Comanda; details: ReturnType<typeof buildHistoricoCardDetails> }>) {
  return (
    <div className="border-t border-[rgba(255,255,255,0.06)] px-5 py-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
        <HistoricoItemsList comanda={comanda} />
        <HistoricoSummaryPanel comanda={comanda} details={details} />
      </div>
    </div>
  )
}

function HistoricoItemsList({ comanda }: Readonly<{ comanda: Comanda }>) {
  if (comanda.itens.length === 0) {
    return <p className="text-sm text-[var(--text-soft)]">Nenhum item registrado.</p>
  }

  return (
    <ul className="space-y-2.5">
      {comanda.itens.map((item, index) => (
        <li className="flex items-start justify-between gap-4" key={`${item.produtoId}-${index}`}>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">
              {item.quantidade}x {item.nome}
            </p>
            {item.observacao ? <p className="mt-1 text-xs italic text-[var(--text-soft)]">{item.observacao}</p> : null}
          </div>
          <span className="shrink-0 text-sm font-semibold text-[var(--text-primary)]">
            {formatCurrency(item.quantidade * item.precoUnitario)}
          </span>
        </li>
      ))}
    </ul>
  )
}

function HistoricoSummaryPanel({
  comanda,
  details,
}: Readonly<{ comanda: Comanda; details: ReturnType<typeof buildHistoricoCardDetails> }>) {
  return (
    <div className="rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Resumo</p>
      <div className="mt-3 space-y-2 text-sm">
        <SummaryLine label="Subtotal" value={formatCurrency(details.subtotal)} />
        {comanda.desconto > 0 ? (
          <SummaryLine
            label={`Desconto (${comanda.desconto}%)`}
            tone="danger"
            value={`- ${formatCurrency(details.descontoVal)}`}
          />
        ) : null}
        {comanda.acrescimo > 0 ? (
          <SummaryLine
            label={`Serviço (${comanda.acrescimo}%)`}
            tone="warning"
            value={`+ ${formatCurrency(details.acrescimoVal)}`}
          />
        ) : null}
        <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.06)] pt-2 text-base font-semibold text-[var(--text-primary)]">
          <span>Total</span>
          <span>{formatCurrency(details.total)}</span>
        </div>
      </div>
    </div>
  )
}

function SummaryLine({
  label,
  tone = 'muted',
  value,
}: Readonly<{ label: string; tone?: 'danger' | 'muted' | 'warning'; value: string }>) {
  const toneClass = resolveSummaryToneClass(tone)
  return (
    <div className={`flex items-center justify-between ${toneClass}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function resolveSummaryToneClass(tone: 'danger' | 'muted' | 'warning') {
  if (tone === 'danger') {
    return 'text-[#f87171]'
  }

  if (tone === 'warning') {
    return 'text-[#fb923c]'
  }

  return 'text-[var(--text-soft)]'
}

function buildHistoricoCardDetails(comanda: Comanda) {
  const badge = STATUS_MAP[comanda.status] ?? STATUS_MAP.aberta
  const subtotal = comanda.itens.reduce((sum, item) => sum + item.quantidade * item.precoUnitario, 0)

  return {
    acrescimoVal: subtotal * (comanda.acrescimo / 100),
    badge,
    badgeStyle: { background: badge.bg, color: badge.color },
    descontoVal: subtotal * (comanda.desconto / 100),
    responsavelLabel: comanda.garcomNome
      ? `Responsável: ${resolveHistoricoResponsavel(comanda)}`
      : 'Operação do balcão/empresa',
    subtotal,
    total: calcTotal(comanda),
    totalItens: comanda.itens.reduce((sum, item) => sum + item.quantidade, 0),
    totalStyle: { color: badge.color },
  }
}
