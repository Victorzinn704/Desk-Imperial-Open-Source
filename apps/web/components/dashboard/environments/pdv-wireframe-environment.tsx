'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { OperationsKitchenItemRecord, OperationsKitchenResponse } from '@contracts/contracts'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { fetchOperationsKitchen, fetchOperationsLive, type AuthUser } from '@/lib/api'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { buildPdvComandas } from '@/components/pdv/pdv-operations'
import { calcSubtotal, calcTotal, formatElapsed, type Comanda } from '@/components/pdv/pdv-types'
import type { PdvMesaIntent } from '@/components/pdv/pdv-navigation-intent'
import { formatCurrency } from '@/lib/currency'

type PdvVariant = 'grid' | 'comandas' | 'kds' | 'cobranca'

type PdvWireframeEnvironmentProps = {
  mesaIntent?: PdvMesaIntent | null
  user: AuthUser
  variant?: PdvVariant
}

type ProductCardRecord = {
  id: string
  name: string
  category: string
  unitPrice: number
  active?: boolean
}

type KitchenTicket = {
  id: string
  code: string
  mesaLabel: string
  employeeName: string
  elapsedMinutes: number
  items: OperationsKitchenItemRecord[]
  status: 'queued' | 'in_preparation' | 'ready'
  sortTotal: number
}

type ComandaCurrency = Parameters<typeof formatCurrency>[1]

export function PdvWireframeEnvironment({
  mesaIntent = null,
  user,
  variant = 'grid',
}: Readonly<PdvWireframeEnvironmentProps>) {
  const { productsQuery } = useDashboardQueries({ section: 'pdv' })
  const [activeCategory, setActiveCategory] = useState<string>('tudo')

  const operationsQuery = useQuery({
    queryKey: ['operations', 'live', 'dashboard-pdv'],
    queryFn: () => fetchOperationsLive({ includeCashMovements: false }),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  })

  const kitchenQuery = useQuery({
    queryKey: ['operations', 'kitchen', 'dashboard-pdv'],
    queryFn: () => fetchOperationsKitchen({ includeCashMovements: false }),
    enabled: variant === 'kds',
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  })

  const currency = user.preferredCurrency as ComandaCurrency
  const products = ((productsQuery.data?.items ?? []) as ProductCardRecord[]).filter((product) => product.active !== false)
  const comandas = buildPdvComandas(operationsQuery.data)
  const openComandas = useMemo(
    () =>
      comandas
        .filter((comanda) => comanda.status !== 'fechada')
        .sort((left, right) => left.abertaEm.getTime() - right.abertaEm.getTime()),
    [comandas],
  )

  const selectedComanda =
    openComandas.find((comanda) => comanda.id === mesaIntent?.comandaId) ??
    openComandas.find((comanda) => comanda.mesa === mesaIntent?.mesaLabel) ??
    openComandas[0] ??
    null

  const chargeComanda = useMemo(() => {
    const ranked = [...openComandas].sort((left, right) => calcTotal(right) - calcTotal(left))
    return ranked[0] ?? selectedComanda
  }, [openComandas, selectedComanda])

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const product of products) {
      counts.set(product.category, (counts.get(product.category) ?? 0) + 1)
    }

    return [
      { id: 'tudo', label: 'tudo', count: products.length },
      ...[...counts.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'pt-BR'))
        .map(([label, count]) => ({
          id: label,
          label: label.toLowerCase(),
          count,
        })),
    ]
  }, [products])

  const filteredProducts =
    activeCategory === 'tudo' ? products : products.filter((product) => product.category === activeCategory)

  const kitchenTickets = useMemo(
    () => buildKitchenTickets(kitchenQuery.data, openComandas),
    [kitchenQuery.data, openComandas],
  )

  switch (variant) {
    case 'comandas':
      return <PdvComandasView comandas={openComandas} currency={currency} />
    case 'kds':
      return <PdvKitchenView isLoading={kitchenQuery.isLoading} tickets={kitchenTickets} />
    case 'cobranca':
      return <PdvChargeView comanda={chargeComanda} currency={currency} />
    case 'grid':
    default:
      return (
        <PdvGridView
          activeCategory={activeCategory}
          categories={categories}
          comanda={selectedComanda}
          currency={currency}
          products={filteredProducts}
          onCategoryChange={setActiveCategory}
        />
      )
  }
}

function PdvGridView({
  activeCategory,
  categories,
  comanda,
  currency,
  products,
  onCategoryChange,
}: Readonly<{
  activeCategory: string
  categories: Array<{ id: string; label: string; count: number }>
  comanda: Comanda | null
  currency: ComandaCurrency
  products: ProductCardRecord[]
  onCategoryChange: (categoryId: string) => void
}>) {
  const subtotal = comanda ? calcSubtotal(comanda) : 0
  const total = comanda ? calcTotal(comanda) : 0
  const serviceFee = Math.max(0, total - subtotal)

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_360px] xl:items-start">
      <article className="imperial-card p-5">
        <div className="mb-5 flex flex-wrap gap-2">
          {categories.map((category) => {
            const active = activeCategory === category.id
            return (
              <button
                className={active ? 'wireframe-subnav__item wireframe-subnav__item--active' : 'wireframe-subnav__item'}
                key={category.id}
                type="button"
                onClick={() => onCategoryChange(category.id)}
              >
                <span>{category.count}</span>
                {category.label}
              </button>
            )
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {products.slice(0, 12).map((product) => (
            <div
              className="rounded-[8px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-4"
              key={product.id}
            >
              <div className="flex aspect-[4/3] items-center justify-center rounded-[8px] border border-dashed border-[var(--border)] text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                foto
              </div>
              <p className="mt-4 text-sm font-semibold text-[var(--text-primary)]">{product.name}</p>
              <p className="mt-1 text-xs text-[var(--text-soft)]">{product.category}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <strong className="text-sm text-[var(--text-primary)]">{formatCurrency(product.unitPrice, currency)}</strong>
                <button
                  aria-label={`Adicionar ${product.name}`}
                  className="wireframe-theme-button"
                  title={`Adicionar ${product.name}`}
                  type="button"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          ))}
          {products.length === 0 ? (
            <div className="rounded-[8px] border border-dashed border-[var(--border)] px-4 py-10 text-center text-sm text-[var(--text-soft)] md:col-span-2 2xl:col-span-4">
              Nenhum produto disponivel nesta categoria.
            </div>
          ) : null}
        </div>
      </article>

      <article className="imperial-card p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[1.45rem] font-semibold leading-tight text-[var(--text-primary)]">
              {comanda?.mesa ? `Comanda · Mesa ${comanda.mesa}` : 'Comanda · Sem mesa selecionada'}
            </h3>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {comanda ? `${formatComandaCode(comanda.id)} · aberta ${formatElapsed(comanda.abertaEm)}` : 'aguardando abertura'}
            </p>
          </div>
          <StampPill>{comanda ? `${comanda.itens.length} itens` : '0 itens'}</StampPill>
        </div>

        <div className="border-t border-dashed border-[var(--border)] pt-1">
          {comanda ? (
            <>
              <div className="space-y-2.5">
                {comanda.itens.slice(0, 6).map((item, index) => (
                  <div
                    className="grid grid-cols-[30px_minmax(0,1fr)_72px_18px] gap-2 border-b border-dotted border-[var(--border)] py-2.5 text-sm last:border-b-0"
                    key={`${comanda.id}-${index}`}
                  >
                    <span className="font-semibold text-[var(--accent-strong)]">{item.quantidade}x</span>
                    <span className="truncate text-[var(--text-primary)]">{item.nome}</span>
                    <span className="text-right text-[12px] text-[var(--text-primary)]">
                      {formatCurrency(item.precoUnitario * item.quantidade, currency)}
                    </span>
                    <span className="text-right text-[var(--text-muted)]">×</span>
                    {item.observacao ? (
                      <span className="col-start-2 col-end-5 text-[12px] italic text-[var(--text-soft)]">
                        ↳ {item.observacao}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-1 text-[12px] text-[var(--text-soft)]">
                <div className="flex items-center justify-between gap-3">
                  <span>subtotal</span>
                  <span>{formatCurrency(subtotal, currency)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>taxa / acrescimo</span>
                  <span>{formatCurrency(serviceFee, currency)}</span>
                </div>
              </div>

              <div className="mt-3 flex items-end justify-between gap-4 border-t border-dashed border-[var(--border)] pt-3">
                <span className="text-sm text-[var(--text-soft)]">total</span>
                <strong className="font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[2rem] leading-none text-[var(--text-primary)]">
                  {formatCurrency(total, currency)}
                </strong>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  className="rounded-[8px] border border-dashed border-[var(--border-strong)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  type="button"
                >
                  salvar
                </button>
                <button
                  className="rounded-[8px] border border-transparent bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--on-accent)]"
                  type="button"
                >
                  cobrar
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-[8px] border border-dashed border-[var(--border)] px-4 py-10 text-center text-sm text-[var(--text-soft)]">
              Nenhuma comanda aberta no momento.
            </div>
          )}
        </div>
      </article>
    </section>
  )
}

function PdvComandasView({
  comandas,
  currency,
}: Readonly<{
  comandas: Comanda[]
  currency: ComandaCurrency
}>) {
  const groups = useMemo(() => {
    const mesa = comandas.filter((comanda) => hasMesa(comanda))
    const balcao = comandas.filter((comanda) => !hasMesa(comanda) || /balcao|balc[aã]o/i.test(comanda.mesa ?? ''))
    const delivery = comandas.filter((comanda) => /delivery|ifood|uber/i.test(`${comanda.mesa ?? ''} ${comanda.clienteNome ?? ''}`))
    return [
      { label: `todas (${comandas.length})`, active: true },
      { label: `mesa (${mesa.length})` },
      { label: `balcao (${balcao.length})` },
      { label: `delivery (${delivery.length})` },
    ]
  }, [comandas])

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {groups.map((group, index) => (
          <span
            className={group.active || index === 0 ? 'wireframe-subnav__item wireframe-subnav__item--active' : 'wireframe-subnav__item'}
            key={group.label}
          >
            {group.label}
          </span>
        ))}
        <button
          className="ml-auto rounded-full border border-transparent bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)]"
          type="button"
        >
          + nova comanda
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {comandas.length > 0 ? (
          comandas.map((comanda) => {
            const totalItems = comanda.itens.reduce((sum, item) => sum + item.quantidade, 0)
            const elapsed = formatElapsed(comanda.abertaEm)

            return (
              <article className="imperial-card p-4" key={comanda.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[1.3rem] font-semibold text-[var(--text-primary)]">
                      {resolveComandaLabel(comanda)}
                    </h3>
                    <p className="mt-1 text-[12px] text-[var(--text-soft)]">
                      {totalItems} itens · {comanda.garcomNome ?? 'sem garcom'}
                    </p>
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    {formatComandaCode(comanda.id)}
                  </span>
                </div>

                <div className="mt-4 font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[1.8rem] leading-none text-[var(--text-primary)]">
                  {formatCurrency(calcTotal(comanda), currency)}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <ComandaStatusPill status={comanda.status} />
                  <span className="text-[11px] font-medium text-[var(--text-soft)]">{elapsed}</span>
                </div>
              </article>
            )
          })
        ) : (
          <div className="rounded-[8px] border border-dashed border-[var(--border)] px-4 py-10 text-center text-sm text-[var(--text-soft)] md:col-span-2 2xl:col-span-4">
            Nenhuma comanda aberta no momento.
          </div>
        )}
      </div>
    </section>
  )
}

function PdvKitchenView({
  isLoading,
  tickets,
}: Readonly<{
  isLoading: boolean
  tickets: KitchenTicket[]
}>) {
  return (
    <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {isLoading ? (
        Array.from({ length: 4 }).map((_, index) => (
          <div className="imperial-card p-5" key={index}>
            <div className="skeleton-shimmer h-48 rounded-[8px]" />
          </div>
        ))
      ) : tickets.length > 0 ? (
        tickets.map((ticket, index) => {
          const overdue = ticket.elapsedMinutes > 30
          const toneClass =
            ticket.status === 'ready'
              ? 'bg-[color-mix(in_srgb,var(--success)_10%,var(--surface))]'
              : overdue
                ? 'bg-[color-mix(in_srgb,var(--danger)_7%,var(--surface))]'
                : 'bg-[color-mix(in_srgb,var(--surface)_96%,transparent)]'

          return (
            <article className={`imperial-card p-4 ${toneClass}`} key={ticket.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[1.45rem] font-semibold leading-none text-[var(--text-primary)]">
                    {compressMesaLabel(ticket.mesaLabel)}
                  </h3>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    {ticket.code} · {ticket.employeeName}
                  </p>
                </div>
                <span
                  className={`text-[13px] font-semibold ${
                    overdue ? 'text-[var(--danger)]' : ticket.elapsedMinutes > 20 ? 'text-[var(--warning)]' : 'text-[var(--text-soft)]'
                  }`}
                >
                  {ticket.elapsedMinutes}min
                </span>
              </div>

              <div className="mt-3 border-t border-dashed border-[var(--border)] pt-2">
                {ticket.items.map((item) => (
                  <div className="border-b border-dotted border-[var(--border)] py-2 last:border-b-0" key={item.itemId}>
                    <div className="flex gap-2 text-sm">
                      <span className="font-semibold text-[var(--accent-strong)]">{item.quantity}x</span>
                      <span className="text-[var(--text-primary)]">{item.productName}</span>
                    </div>
                    {item.notes ? <p className="pl-6 text-[12px] italic text-[var(--text-soft)]">↳ {item.notes}</p> : null}
                  </div>
                ))}
              </div>

              <button
                className={`mt-4 w-full rounded-[8px] border px-3 py-2 text-sm font-semibold ${
                  ticket.status === 'ready'
                    ? 'border-[color-mix(in_srgb,var(--success)_30%,var(--paper))] bg-[var(--success)] text-[var(--paper)]'
                    : 'border-[var(--border-strong)] bg-[var(--text-primary)] text-[var(--paper)]'
                }`}
                type="button"
              >
                {ticket.status === 'ready' ? 'entregar' : 'marcar pronto'}
              </button>
            </article>
          )
        })
      ) : (
        <div className="rounded-[8px] border border-dashed border-[var(--border)] px-4 py-10 text-center text-sm text-[var(--text-soft)] md:col-span-2 2xl:col-span-4">
          Sem tickets ativos na cozinha.
        </div>
      )}
    </section>
  )
}

function PdvChargeView({
  comanda,
  currency,
}: Readonly<{
  comanda: Comanda | null
  currency: ComandaCurrency
}>) {
  const subtotal = comanda ? calcSubtotal(comanda) : 0
  const total = comanda ? calcTotal(comanda) : 0
  const serviceFee = Math.max(0, total - subtotal)

  return (
    <section className="grid gap-5 xl:grid-cols-[1.3fr_1fr] xl:items-start">
      <article className="imperial-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[1.45rem] font-semibold text-[var(--text-primary)]">
              {comanda?.mesa ? `Cobrar · Mesa ${comanda.mesa}` : 'Cobrar · Sem comanda'}
            </h3>
            <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {comanda ? `${formatComandaCode(comanda.id)} · ${comanda.garcomNome ?? 'sem garcom'} · aberta ${formatElapsed(comanda.abertaEm)}` : 'aguardando selecao'}
            </p>
          </div>
          {comanda ? <ComandaStatusPill status={comanda.status} /> : null}
        </div>

        {comanda ? (
          <>
            <div className="mt-4 space-y-2">
              {comanda.itens.map((item, index) => (
                <div
                  className="grid grid-cols-[36px_minmax(0,1fr)_70px_72px] gap-2 border-b border-dotted border-[var(--border)] py-2.5 text-sm last:border-b-0"
                  key={`${comanda.id}-charge-${index}`}
                >
                  <span className="font-semibold text-[var(--accent-strong)]">{item.quantidade}x</span>
                  <span className="truncate text-[var(--text-primary)]">{item.nome}</span>
                  <span className="text-right text-[12px] text-[var(--text-soft)]">
                    {formatCurrency(item.precoUnitario, currency)}
                  </span>
                  <span className="text-right text-[var(--text-primary)]">
                    {formatCurrency(item.precoUnitario * item.quantidade, currency)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[12px] text-[var(--text-soft)]">
              <span>subtotal</span>
              <span>{formatCurrency(subtotal, currency)}</span>
              <span>taxa servico / acrescimo</span>
              <span>{formatCurrency(serviceFee, currency)}</span>
              <span>desconto</span>
              <span>{formatCurrency(0, currency)}</span>
            </div>

            <div className="mt-4 flex items-end justify-between gap-4 border-t border-dashed border-[var(--border)] pt-4">
              <span className="text-sm text-[var(--text-soft)]">total</span>
              <strong className="font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[2.2rem] leading-none text-[var(--text-primary)]">
                {formatCurrency(total, currency)}
              </strong>
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-[8px] border border-dashed border-[var(--border)] px-4 py-10 text-center text-sm text-[var(--text-soft)]">
            Nenhuma comanda aberta para cobranca.
          </div>
        )}
      </article>

      <div className="space-y-4">
        <article className="imperial-card p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">forma de pagamento</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {['PIX', 'debito', 'credito', 'dinheiro', 'voucher', 'dividir'].map((method, index) => (
              <button
                className={`rounded-[8px] border px-3 py-3 text-sm ${
                  index === 0
                    ? 'border-[color-mix(in_srgb,var(--accent)_40%,var(--paper))] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent-strong)]'
                    : 'border-dashed border-[var(--border)] text-[var(--text-primary)]'
                }`}
                key={method}
                type="button"
              >
                {method}
              </button>
            ))}
          </div>
        </article>

        <article className="imperial-card p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">valor recebido</p>
          <div className="mt-3 rounded-[8px] border border-[var(--border-strong)] px-4 py-3 text-right font-['JetBrains_Mono','Consolas',monospace] text-[1.5rem] text-[var(--text-primary)]">
            {comanda ? formatCurrency(total, currency).replace(/[^\d,.-]/g, '').trim() : '0,00'}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '←'].map((key) => (
              <button
                className="rounded-[8px] border border-dashed border-[var(--border)] px-3 py-3 text-center font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[1.1rem] font-semibold text-[var(--text-primary)]"
                key={key}
                type="button"
              >
                {key}
              </button>
            ))}
          </div>

          <button
            className="mt-3 w-full rounded-[8px] border border-transparent bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--on-accent)]"
            type="button"
          >
            finalizar pagamento
          </button>
        </article>
      </div>
    </section>
  )
}

function ComandaStatusPill({ status }: Readonly<{ status: Comanda['status'] }>) {
  const copy = {
    aberta: {
      label: 'aberta',
      className:
        'border-[color-mix(in_srgb,var(--accent)_32%,var(--paper))] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent-strong)]',
    },
    em_preparo: {
      label: 'preparando',
      className:
        'border-[color-mix(in_srgb,var(--warning)_28%,var(--paper))] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-[var(--warning)]',
    },
    pronta: {
      label: 'pronto',
      className:
        'border-[color-mix(in_srgb,var(--success)_28%,var(--paper))] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)]',
    },
    fechada: {
      label: 'fechada',
      className:
        'border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] text-[var(--text-soft)]',
    },
  }[status]

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${copy.className}`}>{copy.label}</span>
}

function StampPill({ children }: Readonly<{ children: string }>) {
  return (
    <span className="inline-flex rounded-full border border-[color-mix(in_srgb,var(--accent)_34%,var(--paper))] px-2.5 py-1 text-[11px] font-medium text-[var(--accent-strong)]">
      {children}
    </span>
  )
}

function buildKitchenTickets(
  response: OperationsKitchenResponse | undefined,
  comandas: Comanda[],
): KitchenTicket[] {
  const comandaLookup = new Map(comandas.map((comanda) => [comanda.id, comanda]))
  const groups = new Map<
    string,
    {
      comandaId: string
      mesaLabel: string
      employeeName: string
      items: OperationsKitchenItemRecord[]
    }
  >()

  for (const item of response?.items ?? []) {
    const existing = groups.get(item.comandaId)
    if (existing) {
      existing.items.push(item)
      continue
    }

    groups.set(item.comandaId, {
      comandaId: item.comandaId,
      mesaLabel: item.mesaLabel,
      employeeName: item.employeeName,
      items: [item],
    })
  }

  return [...groups.values()]
    .map((group) => {
      const kitchenStatuses = group.items.map((item) => item.kitchenStatus)
      const queuedAt = group.items
        .map((item) => item.kitchenQueuedAt)
        .filter((value): value is string => Boolean(value))
        .sort()[0]

      const elapsedMinutes = queuedAt ? Math.max(0, Math.floor((Date.now() - new Date(queuedAt).getTime()) / 60000)) : 0
      const relatedComanda = comandaLookup.get(group.comandaId)

      const status: KitchenTicket['status'] = kitchenStatuses.every((currentStatus) => currentStatus === 'READY')
        ? 'ready'
        : kitchenStatuses.some((currentStatus) => currentStatus === 'IN_PREPARATION')
          ? 'in_preparation'
          : 'queued'

      return {
        id: group.comandaId,
        code: formatComandaCode(group.comandaId),
        mesaLabel: group.mesaLabel,
        employeeName: group.employeeName,
        elapsedMinutes,
        items: group.items,
        status,
        sortTotal: relatedComanda ? calcTotal(relatedComanda) : 0,
      }
    })
    .sort((left, right) => right.elapsedMinutes - left.elapsedMinutes || right.sortTotal - left.sortTotal)
}

function formatComandaCode(id: string) {
  if (id.startsWith('#')) {
    return id
  }

  const digits = id.replace(/\D/g, '')
  if (digits.length > 0) {
    return `#${digits.slice(-4)}`
  }

  return `#${id.slice(0, 4).toUpperCase()}`
}

function resolveComandaLabel(comanda: Comanda) {
  if (comanda.mesa?.trim()) {
    return /^mesa\b/i.test(comanda.mesa) ? comanda.mesa : `Mesa ${comanda.mesa}`
  }

  if (comanda.clienteNome?.trim()) {
    return comanda.clienteNome
  }

  return 'Balcao'
}

function hasMesa(comanda: Comanda) {
  return Boolean(comanda.mesa?.trim()) && !/delivery|balcao|balc[aã]o/i.test(comanda.mesa ?? '')
}

function compressMesaLabel(label: string) {
  const digits = label.match(/\d+/)?.[0]
  if (digits) {
    return `M${digits.padStart(2, '0')}`
  }

  const normalized = label.trim().toUpperCase()
  return normalized.slice(0, 2)
}
