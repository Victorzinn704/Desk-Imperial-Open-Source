'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ComandaPaymentMethod } from '@contracts/contracts'
import { calcSubtotal, calcTotal, type Comanda, formatElapsed } from '@/components/pdv/pdv-types'
import { toPdvComanda } from '@/components/pdv/pdv-operations'
import { formatBRL as formatCurrency } from '@/lib/currency'
import { fetchComandaDetails } from '@/lib/api'
import { OwnerComandaCardBody } from './owner-comanda-card-sections'
import { formatDateTime, STATUS_MAP } from './owner-comandas-view-model'

type OwnerComandaCardProps = {
  comanda: Comanda
  defaultOpen?: boolean
  isBusy?: boolean
  onAddItems?: (comanda: Comanda) => void
  onCloseComanda?: (
    id: string,
    discountAmount: number,
    serviceFeeAmount: number,
    paymentMethod?: ComandaPaymentMethod,
  ) => Promise<unknown> | undefined
  onCreatePayment?: (id: string, amount: number, method: ComandaPaymentMethod) => Promise<unknown> | undefined
}

export function OwnerComandaCard({
  comanda,
  defaultOpen = false,
  isBusy = false,
  onAddItems,
  onCloseComanda,
  onCreatePayment,
}: OwnerComandaCardProps) {
  const [open, setOpen] = useState(defaultOpen)
  const detailsQuery = useQuery({
    queryKey: ['comanda-details', comanda.id],
    queryFn: async () => {
      const response = await fetchComandaDetails(comanda.id)
      return toPdvComanda(response.comanda)
    },
    enabled: open,
    staleTime: 5_000,
  })

  const derived = buildComandaCardDerived(comanda, detailsQuery.data, detailsQuery.isLoading)

  return (
    <li
      className="overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-panel)]"
      data-testid={`owner-comanda-card-${comanda.id}`}
    >
      <OwnerComandaCardHeader
        activeComanda={derived.activeComanda}
        detailHint={derived.detailHint}
        open={open}
        setOpen={setOpen}
        total={derived.total}
      />
      {open ? (
        <OwnerComandaCardBody
          acrescimoVal={derived.acrescimoVal}
          activeComanda={derived.activeComanda}
          badgeColor={(STATUS_MAP[derived.activeComanda.status] ?? STATUS_MAP.aberta).color}
          canClose={derived.canClose}
          descontoVal={derived.descontoVal}
          detailHint={derived.detailHint}
          isBusy={isBusy}
          isLoadingDetails={detailsQuery.isLoading}
          itemCount={derived.itemCount}
          subtotal={derived.subtotal}
          total={derived.total}
          onAddItems={onAddItems}
          onCloseComanda={onCloseComanda}
          onCreatePayment={onCreatePayment}
        />
      ) : null}
    </li>
  )
}

function buildComandaCardDerived(comanda: Comanda, detailsData: Comanda | undefined, isLoadingDetails: boolean) {
  const activeComanda = detailsData ?? comanda
  const total = calcTotal(activeComanda)
  const subtotal = calcSubtotal(activeComanda)
  const descontoVal = subtotal * (activeComanda.desconto / 100)
  const acrescimoVal = subtotal * (activeComanda.acrescimo / 100)
  const itemCount = activeComanda.itens.reduce((sum, item) => sum + item.quantidade, 0)
  const canClose = activeComanda.status !== 'fechada'
  const detailHint = buildDetailHint(itemCount, isLoadingDetails, Boolean(detailsData))

  return {
    activeComanda,
    acrescimoVal,
    canClose,
    descontoVal,
    detailHint,
    itemCount,
    subtotal,
    total,
  }
}

function buildDetailHint(itemCount: number, isLoadingDetails: boolean, hasDetails: boolean) {
  if (itemCount > 0) {
    return `${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`
  }
  if (isLoadingDetails) {
    return 'Carregando extrato...'
  }
  return hasDetails ? 'Extrato pronto' : 'Extrato sob demanda'
}

function OwnerComandaCardHeader({
  activeComanda,
  detailHint,
  open,
  setOpen,
  total,
}: {
  activeComanda: Comanda
  detailHint: string
  open: boolean
  setOpen: (value: boolean | ((value: boolean) => boolean)) => void
  total: number
}) {
  const badge = STATUS_MAP[activeComanda.status] ?? STATUS_MAP.aberta

  return (
    <button
      className="flex w-full items-start justify-between gap-3 px-4 py-4 transition-colors active:bg-[var(--surface-muted)]"
      style={{ WebkitTapHighlightColor: 'transparent' }}
      type="button"
      onClick={() => setOpen((value) => !value)}
    >
      <div className="min-w-0 flex-1 text-left">
        <div className="mb-1 flex items-center gap-2">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Mesa {activeComanda.mesa ?? '—'}</p>
          <span
            className="shrink-0 rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]"
            style={{ background: badge.bg, color: badge.color }}
          >
            {badge.label}
          </span>
        </div>
        <OwnerComandaCardMeta activeComanda={activeComanda} detailHint={detailHint} />
      </div>

      <div className="ml-2 flex shrink-0 items-center gap-2 pt-0.5">
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Total final</p>
          <span className="text-sm font-bold" style={{ color: badge.color }}>
            {formatCurrency(total)}
          </span>
        </div>
        {open ? (
          <ChevronDown className="size-4 text-[var(--text-soft)]" />
        ) : (
          <ChevronRight className="size-4 text-[var(--text-soft)]" />
        )}
      </div>
    </button>
  )
}

function OwnerComandaCardMeta({ activeComanda, detailHint }: { activeComanda: Comanda; detailHint: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {activeComanda.garcomNome ? (
        <span className="rounded-full bg-[rgba(167,139,250,0.14)] px-2 py-0.5 text-[10px] font-semibold text-[#c4b5fd]">
          {activeComanda.garcomNome}
        </span>
      ) : null}
      <span className="text-[11px] text-[var(--text-soft)]">Aberta em {formatDateTime(activeComanda.abertaEm)}</span>
      <span className="text-[11px] text-[var(--text-soft)]">
        {detailHint} · há {formatElapsed(activeComanda.abertaEm)}
      </span>
    </div>
  )
}
