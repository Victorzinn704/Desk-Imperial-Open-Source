'use client'

import { Ban, ReceiptText } from 'lucide-react'
import type { OrderRecord } from '@contracts/contracts'
import { formatCurrencyComparison } from '@/lib/currency'
import { formatBuyerType, maskBuyerDocument } from '@/lib/dashboard-format'
import { Button } from '@/components/shared/button'
import { ListMetric, ListRow } from '@/components/shared/list-primitives'

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
    <ListRow
      actions={
        order.status === 'COMPLETED' ? (
          <Button disabled={busy} onClick={() => onCancel(order.id)} size="sm" variant="ghost">
            <Ban className="size-4" />
            Cancelar
          </Button>
        ) : null
      }
      details={
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <ListMetric label="Receita" value={revenueValue.primary} hint={revenueValue.secondary ?? undefined} />
            <ListMetric label="Lucro" value={profitValue.primary} hint={profitValue.secondary ?? undefined} />
            <ListMetric label="Unidades" value={order.totalItems} hint={`${order.items.length} linha(s) no pedido`} />
          </div>

          <div className="space-y-2">
            {order.items.map((item) => {
              const lineRevenueValue = formatCurrencyComparison({
                originalValue: item.originalLineRevenue,
                originalCurrency: item.currency,
                convertedValue: item.lineRevenue,
                displayCurrency: order.displayCurrency,
              })

              return (
                <div
                  className="flex items-center justify-between gap-4 rounded-[20px] border border-white/6 bg-[rgba(255,255,255,0.02)] px-4 py-3"
                  key={item.id}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--text-primary)]">{item.productName}</p>
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
              )
            })}
          </div>
        </div>
      }
      leading={
        <span className="flex size-12 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(143,183,255,0.08)] text-[var(--info)]">
          <ReceiptText className="size-5" />
        </span>
      }
      meta={`${order.channel || 'Canal não informado'} · ${new Date(order.createdAt).toLocaleString('pt-BR')}`}
      status={
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
            order.status === 'COMPLETED'
              ? 'border border-[rgba(123,214,138,0.28)] bg-[rgba(123,214,138,0.12)] text-[var(--success)]'
              : 'border border-[rgba(245,132,132,0.24)] bg-[rgba(245,132,132,0.1)] text-[var(--danger)]'
          }`}
        >
          {order.status === 'COMPLETED' ? 'concluido' : 'cancelado'}
        </span>
      }
      subtitle={
        <div className="space-y-2">
          <p>
            {formatBuyerType(order.buyerType)} • {maskBuyerDocument(order.buyerDocument)}
          </p>
          <p>
            {[order.buyerDistrict, order.buyerCity, order.buyerState, order.buyerCountry]
              .filter(Boolean)
              .join(', ') || 'Local da venda não informado'}
          </p>
          <p>
            {order.sellerName
              ? `Vendedor ${order.sellerName}${order.sellerCode ? ` • ID ${order.sellerCode}` : ''}`
              : 'Venda sem funcionário vinculado'}
          </p>
          <p>{order.notes || 'Pedido sem observações adicionais.'}</p>
        </div>
      }
      title={<h3 className="text-lg font-semibold text-white">{order.customerName || 'Cliente não informado'}</h3>}
    />
  )
}
