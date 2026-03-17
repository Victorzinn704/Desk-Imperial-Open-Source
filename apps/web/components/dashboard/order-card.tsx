'use client'

import { Ban, ReceiptText } from 'lucide-react'
import type { OrderRecord } from '@contracts/contracts'
import { formatCurrencyComparison } from '@/lib/currency'
import { formatBuyerType, maskBuyerDocument } from '@/lib/dashboard-format'
import { Button } from '@/components/shared/button'

export function OrderCard({
  order,
  onCancel,
  busy,
}: Readonly<{
  order: OrderRecord
  onCancel: (orderId: string) => void
  busy?: boolean
}>) {
  const revenueValue = formatCurrencyComparison({
    originalValue: order.originalTotalRevenue,
    originalCurrency: order.currency,
    convertedValue: order.totalRevenue,
    displayCurrency: order.displayCurrency,
  })
  const profitValue = formatCurrencyComparison({
    originalValue: order.originalTotalProfit,
    originalCurrency: order.currency,
    convertedValue: order.totalProfit,
    displayCurrency: order.displayCurrency,
  })

  return (
    <article className="imperial-card-soft p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex size-11 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(143,183,255,0.08)] text-[var(--info)]">
            <ReceiptText className="size-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-semibold text-white">{order.customerName || 'Cliente nao informado'}</h3>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                order.status === 'COMPLETED'
                  ? 'border border-[rgba(123,214,138,0.28)] bg-[rgba(123,214,138,0.12)] text-[var(--success)]'
                  : 'border border-[rgba(245,132,132,0.24)] bg-[rgba(245,132,132,0.1)] text-[var(--danger)]'
              }`}>
                {order.status === 'COMPLETED' ? 'concluido' : 'cancelado'}
              </span>
            </div>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              {order.channel || 'Canal nao informado'} • {new Date(order.createdAt).toLocaleString('pt-BR')}
            </p>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              {formatBuyerType(order.buyerType)} • {maskBuyerDocument(order.buyerDocument)}
            </p>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              {[order.buyerDistrict, order.buyerCity, order.buyerState, order.buyerCountry].filter(Boolean).join(', ') ||
                'Local da venda nao informado'}
            </p>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              {order.sellerName
                ? `Vendedor ${order.sellerName}${order.sellerCode ? ` • ID ${order.sellerCode}` : ''}`
                : 'Venda sem funcionario vinculado'}
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
              {order.notes || 'Pedido sem observacoes adicionais.'}
            </p>
          </div>
        </div>

        {order.status === 'COMPLETED' ? (
          <Button disabled={busy} onClick={() => onCancel(order.id)} size="sm" variant="ghost">
            <Ban className="size-4" />
            Cancelar
          </Button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="imperial-card-stat px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Receita</p>
          <p className="mt-2 text-lg font-semibold text-white">{revenueValue.primary}</p>
          {revenueValue.secondary ? <p className="mt-1 text-xs text-[var(--text-soft)]">{revenueValue.secondary}</p> : null}
        </div>
        <div className="imperial-card-stat px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Lucro</p>
          <p className="mt-2 text-lg font-semibold text-white">{profitValue.primary}</p>
          {profitValue.secondary ? <p className="mt-1 text-xs text-[var(--text-soft)]">{profitValue.secondary}</p> : null}
        </div>
        <div className="imperial-card-stat px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Unidades</p>
          <p className="mt-2 text-lg font-semibold text-white">{order.totalItems}</p>
          <p className="mt-1 text-xs text-[var(--text-soft)]">{order.items.length} linha(s) no pedido</p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {order.items.map((item) => {
          const lineRevenueValue = formatCurrencyComparison({
            originalValue: item.originalLineRevenue,
            originalCurrency: item.currency,
            convertedValue: item.lineRevenue,
            displayCurrency: order.displayCurrency,
          })

          return (
            <div className="imperial-card-stat px-4 py-3" key={item.id}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{item.productName}</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">
                    {item.category} • {item.quantity} unidade(s)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{lineRevenueValue.primary}</p>
                  {lineRevenueValue.secondary ? (
                    <p className="mt-1 text-xs text-[var(--text-soft)]">{lineRevenueValue.secondary}</p>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </article>
  )
}
