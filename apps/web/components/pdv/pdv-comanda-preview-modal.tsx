'use client'

import type { ReactNode } from 'react'
import { Clock, Package, Wallet, X } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import { calcSubtotal, calcTotal, formatElapsed, type Comanda } from './pdv-types'

type PdvComandaPreviewModalProps = Readonly<{
  busy?: boolean
  comanda: Comanda
  onClose: () => void
  onCharge: () => void
  onEdit: () => void
}>

export function PdvComandaPreviewModal({
  busy = false,
  comanda,
  onClose,
  onCharge,
  onEdit,
}: PdvComandaPreviewModalProps) {
  const subtotal = calcSubtotal(comanda)
  const total = calcTotal(comanda)
  const itemCount = comanda.itens.reduce((sum, item) => sum + item.quantidade, 0)
  const paidAmount = comanda.paidAmount ?? 0
  const remainingAmount = Math.max(0, comanda.remainingAmount ?? total - paidAmount)
  const chargeLabel =
    comanda.paymentStatus === 'PAID' || remainingAmount <= 0.009 ? 'Revisar cobrança' : 'Cobrança e pagamento'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] px-4">
      <button
        aria-label="Fechar resumo da comanda"
        className="absolute inset-0 border-0 bg-transparent p-0"
        type="button"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-panel-strong)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Resumo da comanda</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
              {comanda.mesa ? `Mesa ${comanda.mesa}` : `Comanda ${comanda.id.slice(-6).toUpperCase()}`}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              {comanda.clienteNome?.trim() ? comanda.clienteNome : 'Sem cliente identificado'} · {formatElapsed(comanda.abertaEm)}
            </p>
          </div>
          <button
            className="inline-flex size-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-soft)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            type="button"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-4 border-b border-[var(--border)] px-5 py-4 md:grid-cols-4">
          <PreviewStat label="Itens" value={String(itemCount)} />
          <PreviewStat label="Subtotal" value={formatCurrency(subtotal, 'BRL')} />
          <PreviewStat label="Total" value={formatCurrency(total, 'BRL')} />
          <PreviewStat
            label={remainingAmount > 0.009 ? 'Em aberto' : 'Quitado'}
            value={formatCurrency(remainingAmount > 0.009 ? remainingAmount : paidAmount || total, 'BRL')}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-3">
            {comanda.notes?.trim() ? (
              <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Observação</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">{comanda.notes}</p>
              </div>
            ) : null}

            <div className="space-y-2">
              {comanda.itens.length > 0 ? (
                comanda.itens.map((item, index) => (
                  <div
                    className="flex items-start justify-between gap-3 rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3"
                    key={`${item.produtoId}-${index}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{item.nome}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-soft)]">
                        <span>{item.quantidade}x</span>
                        <span>·</span>
                        <span>{formatCurrency(item.precoUnitario, 'BRL')}</span>
                        {item.observacao?.trim() ? (
                          <>
                            <span>·</span>
                            <span className="truncate">{item.observacao}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-[var(--accent)]">
                      {formatCurrency(item.quantidade * item.precoUnitario, 'BRL')}
                    </span>
                  </div>
                ))
              ) : (
                <div className="rounded-[16px] border border-dashed border-[var(--border)] px-4 py-6 text-sm text-[var(--text-soft)]">
                  Esta comanda ainda não carregou itens detalhados. Abra a edição para revisar ou aguarde a sincronização.
                </div>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <InlineFact icon={<Package className="size-3.5" />} label="Status" value={resolveStatusLabel(comanda.status)} />
              <InlineFact icon={<Clock className="size-3.5" />} label="Abertura" value={comanda.abertaEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} />
              <InlineFact icon={<Wallet className="size-3.5" />} label="Pagamento" value={resolvePaymentLabel(comanda)} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--border)] px-5 py-4 md:flex-row md:justify-end">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--border-strong)]"
            type="button"
            onClick={onEdit}
          >
            Editar comanda
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-transparent bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--on-accent)] transition hover:bg-[var(--accent-strong)] disabled:opacity-50"
            disabled={busy}
            type="button"
            onClick={onCharge}
          >
            {busy ? 'Abrindo...' : chargeLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function PreviewStat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  )
}

function InlineFact({
  icon,
  label,
  value,
}: Readonly<{
  icon: ReactNode
  label: string
  value: string
}>) {
  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{value}</p>
    </div>
  )
}

function resolveStatusLabel(status: Comanda['status']) {
  switch (status) {
    case 'em_preparo':
      return 'Em preparo'
    case 'pronta':
      return 'Pronta'
    case 'cancelada':
      return 'Cancelada'
    case 'fechada':
      return 'Fechada'
    case 'aberta':
    default:
      return 'Aberta'
  }
}

function resolvePaymentLabel(comanda: Comanda) {
  switch (comanda.paymentStatus) {
    case 'PAID':
      return 'Pago'
    case 'PARTIAL':
      return 'Parcial'
    case 'UNPAID':
      return 'Pendente'
    default:
      return 'Sem pagamento'
  }
}
