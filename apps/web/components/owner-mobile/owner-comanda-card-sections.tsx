'use client'

import { useMemo, useState } from 'react'
import { Edit2 } from 'lucide-react'
import type { ComandaPaymentMethod } from '@contracts/contracts'
import type { Comanda } from '@/components/pdv/pdv-types'
import { formatBRL as formatCurrency } from '@/lib/currency'

const PAYMENT_METHODS: Array<{ id: ComandaPaymentMethod; label: string }> = [
  { id: 'PIX', label: 'Pix' },
  { id: 'CREDIT', label: 'Crédito' },
  { id: 'DEBIT', label: 'Débito' },
  { id: 'CASH', label: 'Dinheiro' },
  { id: 'VOUCHER', label: 'Voucher' },
  { id: 'OTHER', label: 'Outro' },
]

function roundInputMoney(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.round(Math.max(0, value) * 100) / 100
}

type OwnerComandaCardBodyProps = {
  activeComanda: Comanda
  acrescimoVal: number
  badgeColor: string
  canClose: boolean
  descontoVal: number
  detailHint: string
  isBusy: boolean
  isLoadingDetails: boolean
  itemCount: number
  onAddItems?: (comanda: Comanda) => void
  onCloseComanda?: (
    id: string,
    discountAmount: number,
    serviceFeeAmount: number,
    paymentMethod?: ComandaPaymentMethod,
  ) => Promise<unknown> | void
  onCreatePayment?: (id: string, amount: number, method: ComandaPaymentMethod) => Promise<unknown> | void
  subtotal: number
  total: number
}

export function OwnerComandaCardBody({
  activeComanda,
  acrescimoVal,
  badgeColor,
  canClose,
  descontoVal,
  detailHint,
  isBusy,
  isLoadingDetails,
  itemCount,
  onAddItems,
  onCloseComanda,
  onCreatePayment,
  subtotal,
  total,
}: OwnerComandaCardBodyProps) {
  return (
    <div className="border-t border-[var(--border)] px-4 pb-4 pt-4">
      <OwnerComandaCardSummaryGrid activeComanda={activeComanda} itemCount={itemCount} />
      <OwnerComandaCardPrimaryActions
        activeComanda={activeComanda}
        canClose={canClose}
        isBusy={isBusy}
        onAddItems={onAddItems}
      />
      {canClose && onCloseComanda ? (
        <OwnerComandaCardCloseAction
          acrescimoVal={acrescimoVal}
          activeComanda={activeComanda}
          descontoVal={descontoVal}
          isBusy={isBusy}
          onCloseComanda={onCloseComanda}
          onCreatePayment={onCreatePayment}
          total={total}
        />
      ) : null}
      <OwnerComandaCardItemsSection
        activeComanda={activeComanda}
        detailHint={detailHint}
        isLoadingDetails={isLoadingDetails}
      />
      <OwnerComandaCardTotalsSection
        acrescimoVal={acrescimoVal}
        activeComanda={activeComanda}
        badgeColor={badgeColor}
        descontoVal={descontoVal}
        subtotal={subtotal}
        total={total}
      />
    </div>
  )
}

function OwnerComandaCardPrimaryActions({
  activeComanda,
  canClose,
  isBusy,
  onAddItems,
}: {
  activeComanda: Comanda
  canClose: boolean
  isBusy: boolean
  onAddItems?: (comanda: Comanda) => void
}) {
  if (!canClose || !onAddItems) {
    return null
  }

  return (
    <button
      className="mb-3 flex w-full items-center justify-center gap-2 rounded-[14px] border border-[rgba(0,140,255,0.3)] bg-[rgba(0,140,255,0.1)] px-4 py-3 text-sm font-semibold text-[var(--accent,#008cff)] transition active:scale-[0.98] disabled:opacity-50"
      disabled={isBusy}
      style={{ WebkitTapHighlightColor: 'transparent' }}
      type="button"
      onClick={() => onAddItems(activeComanda)}
    >
      <Edit2 className="size-4" />
      Editar / adicionar itens
    </button>
  )
}

function OwnerComandaCardSummaryGrid({ activeComanda, itemCount }: { activeComanda: Comanda; itemCount: number }) {
  return (
    <div className="mb-4 overflow-hidden rounded-[16px] bg-[var(--border)]">
      <div className="grid grid-cols-2 gap-px sm:grid-cols-4">
        {[
          { label: 'Cliente', value: activeComanda.clienteNome ?? 'Não identificado' },
          { label: 'Responsável', value: activeComanda.garcomNome ?? 'Operação geral' },
          { label: 'Itens', value: String(itemCount) },
          {
            label: 'Abertura',
            value: activeComanda.abertaEm.toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
        ].map(({ label, value }) => (
          <div className="bg-[var(--surface-muted)] px-3 py-3" key={label}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">{label}</p>
            <p className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function OwnerComandaCardCloseAction({
  activeComanda,
  acrescimoVal,
  descontoVal,
  isBusy,
  onCloseComanda,
  onCreatePayment,
  total,
}: {
  activeComanda: Comanda
  acrescimoVal: number
  descontoVal: number
  isBusy: boolean
  onCloseComanda: (
    id: string,
    discountAmount: number,
    serviceFeeAmount: number,
    paymentMethod?: ComandaPaymentMethod,
  ) => Promise<unknown> | void
  onCreatePayment?: (id: string, amount: number, method: ComandaPaymentMethod) => Promise<unknown> | void
  total: number
}) {
  const [paymentMethod, setPaymentMethod] = useState<ComandaPaymentMethod>('PIX')
  const paidAmount =
    activeComanda.paidAmount ?? activeComanda.payments?.reduce((sum, payment) => sum + payment.amount, 0) ?? 0
  const remainingAmount = Math.max(0, activeComanda.remainingAmount ?? total - paidAmount)
  const defaultPartialAmount = roundInputMoney(remainingAmount > 0 ? remainingAmount : total)
  const partialAmountKey = `${activeComanda.id}:${defaultPartialAmount}`
  const [partialAmountState, setPartialAmountState] = useState(() => ({
    key: partialAmountKey,
    value: defaultPartialAmount,
  }))
  const partialAmount = partialAmountState.key === partialAmountKey ? partialAmountState.value : defaultPartialAmount
  const normalizedPartialAmount = useMemo(
    () => Math.min(roundInputMoney(partialAmount), remainingAmount),
    [partialAmount, remainingAmount],
  )
  const canRegisterPartial =
    Boolean(onCreatePayment) && normalizedPartialAmount > 0 && normalizedPartialAmount < remainingAmount

  return (
    <section className="mb-4 rounded-[16px] border border-[rgba(0,140,255,0.24)] bg-[rgba(0,140,255,0.06)] p-3">
      <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Pago</p>
          <p className="mt-1 text-base font-semibold text-[#36f57c]">{formatCurrency(paidAmount)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Restante</p>
          <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">{formatCurrency(remainingAmount)}</p>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {PAYMENT_METHODS.map((method) => (
          <button
            className={`rounded-[12px] border px-2 py-2 text-xs font-semibold transition active:scale-[0.98] ${
              paymentMethod === method.id
                ? 'border-[rgba(0,140,255,0.5)] bg-[rgba(0,140,255,0.18)] text-[var(--accent,#008cff)]'
                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-soft)]'
            }`}
            disabled={isBusy}
            key={method.id}
            type="button"
            onClick={() => setPaymentMethod(method.id)}
          >
            {method.label}
          </button>
        ))}
      </div>
      {onCreatePayment ? (
        <>
          <div className="mb-2 grid grid-cols-3 gap-2">
            {[
              { label: 'Meia', value: remainingAmount / 2 },
              { label: '3 partes', value: remainingAmount / 3 },
              {
                label: `${activeComanda.participantCount ?? 1} pessoas`,
                value: remainingAmount / Math.max(1, activeComanda.participantCount ?? 1),
              },
            ].map((split) => (
              <button
                className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-[11px] font-semibold text-[var(--text-soft)] disabled:opacity-45"
                disabled={isBusy || remainingAmount <= 0}
                key={split.label}
                type="button"
                onClick={() =>
                  setPartialAmountState({
                    key: partialAmountKey,
                    value: roundInputMoney(split.value),
                  })
                }
              >
                {split.label}
              </button>
            ))}
          </div>
          <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input
              aria-label="Valor parcial"
              className="min-h-11 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[rgba(0,140,255,0.5)]"
              disabled={isBusy || remainingAmount <= 0}
              inputMode="decimal"
              min={0}
              step="0.01"
              type="number"
              value={partialAmount}
              onChange={(event) =>
                setPartialAmountState({
                  key: partialAmountKey,
                  value: Number(event.target.value),
                })
              }
            />
            <button
              className="min-h-11 rounded-[12px] border border-[rgba(0,140,255,0.28)] px-3 text-xs font-semibold text-[var(--accent,#008cff)] disabled:opacity-45"
              disabled={isBusy || !canRegisterPartial}
              type="button"
              onClick={() => onCreatePayment(activeComanda.id, normalizedPartialAmount, paymentMethod)}
            >
              Parcial
            </button>
          </div>
        </>
      ) : null}
      <button
        className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-accent/20 bg-accent px-4 py-3 text-sm font-semibold text-[var(--on-accent)] shadow-sm transition active:scale-[0.98] disabled:opacity-50"
        disabled={isBusy}
        type="button"
        onClick={() => onCloseComanda(activeComanda.id, descontoVal, acrescimoVal, paymentMethod)}
      >
        {remainingAmount > 0 ? 'Pagar restante e fechar' : 'Fechar comanda paga'}
      </button>
    </section>
  )
}

function OwnerComandaCardItemsSection({
  activeComanda,
  detailHint,
  isLoadingDetails,
}: {
  activeComanda: Comanda
  detailHint: string
  isLoadingDetails: boolean
}) {
  return (
    <section className="mb-4 border-b border-[var(--border)] pb-4">
      <div className="flex items-center justify-between gap-3 pb-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
            Itens da comanda
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{detailHint}</p>
        </div>
        <span className="text-[10px] text-[var(--text-soft)]">
          {activeComanda.mesa ? `mesa ${activeComanda.mesa}` : 'sem mesa'}
        </span>
      </div>
      <OwnerComandaCardItemsContent activeComanda={activeComanda} isLoadingDetails={isLoadingDetails} />
    </section>
  )
}

function OwnerComandaCardItemsContent({
  activeComanda,
  isLoadingDetails,
}: {
  activeComanda: Comanda
  isLoadingDetails: boolean
}) {
  if (isLoadingDetails) {
    return (
      <div className="flex items-center justify-center px-1 py-5 text-xs text-[var(--text-soft)]">
        Carregando extrato detalhado...
      </div>
    )
  }

  if (activeComanda.itens.length === 0) {
    return (
      <div className="px-1 py-5 text-center text-xs text-[var(--text-soft)]">
        Nenhum item detalhado para esta comanda.
      </div>
    )
  }

  return (
    <ul className="divide-y divide-[var(--border)]" data-testid={`owner-comanda-items-${activeComanda.id}`}>
      {activeComanda.itens.map((item, index) => (
        <li className="flex items-start justify-between gap-3 py-3" key={`${item.produtoId}-${index}`}>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
              {item.quantidade}× {item.nome}
            </p>
            {item.observacao ? (
              <p className="mt-1 text-[11px] italic text-[var(--text-soft)]">{`"${item.observacao}"`}</p>
            ) : null}
          </div>
          <span className="shrink-0 text-sm font-semibold text-[var(--text-primary)]">
            {formatCurrency(item.quantidade * item.precoUnitario)}
          </span>
        </li>
      ))}
    </ul>
  )
}

function OwnerComandaCardTotalsSection({
  activeComanda,
  acrescimoVal,
  badgeColor,
  descontoVal,
  subtotal,
  total,
}: {
  activeComanda: Comanda
  acrescimoVal: number
  badgeColor: string
  descontoVal: number
  subtotal: number
  total: number
}) {
  return (
    <section className="text-xs">
      <div className="space-y-2">
        <div className="flex justify-between gap-3 text-[var(--text-soft)]">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {activeComanda.desconto > 0 ? (
          <div className="flex justify-between gap-3 text-[#fca5a5]">
            <span>Desconto ({activeComanda.desconto}%)</span>
            <span>– {formatCurrency(descontoVal)}</span>
          </div>
        ) : null}
        {activeComanda.acrescimo > 0 ? (
          <div className="flex justify-between gap-3 text-[#fdba74]">
            <span>Serviço ({activeComanda.acrescimo}%)</span>
            <span>+ {formatCurrency(acrescimoVal)}</span>
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
          Total final
        </span>
        <span className="text-base font-bold" style={{ color: badgeColor }}>
          {formatCurrency(total)}
        </span>
      </div>
    </section>
  )
}
