'use client'

import { Package } from 'lucide-react'
import { formatBRL as formatCurrency } from '@/lib/currency'
import {
  buildSelectedPerformerStats,
  buildTopProductsBars,
  getPerformerLeadLabel,
  getTodayRadarTitle,
  getTodayTopProductsEmpty,
  type Performer,
  type PerformerSnapshot,
  slugify,
  type TopProduct,
} from './owner-today-view-model'

type OwnerTodayRadarProps = {
  garconRanking: Performer[]
  garconSnapshots: PerformerSnapshot[]
  selectedPerformer: string
  selectedPerformerSnapshot: PerformerSnapshot | null
  setSelectedPerformer: (value: string) => void
  topProdutos: TopProduct[]
}

export function OwnerTodayRadar({
  garconRanking,
  garconSnapshots,
  selectedPerformer,
  selectedPerformerSnapshot,
  setSelectedPerformer,
  topProdutos,
}: OwnerTodayRadarProps) {
  const topProductsBars = buildTopProductsBars(topProdutos)
  const emptyRanking = getTodayRadarTitle(garconRanking)
  const emptyTopProducts = getTodayTopProductsEmpty(topProdutos)

  return (
    <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
          Radar do turno
        </p>
        <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">Equipe e mix comercial na mesma leitura curta.</p>
      </div>

      <div className="px-4 py-3">
        <OwnerTodayRadarHeader />
        {garconSnapshots.length > 0 ? (
          <OwnerTodayPerformerChipList
            garconSnapshots={garconSnapshots}
            selectedPerformer={selectedPerformer}
            setSelectedPerformer={setSelectedPerformer}
          />
        ) : null}
        {selectedPerformerSnapshot ? <OwnerTodayPerformerSnapshot snapshot={selectedPerformerSnapshot} /> : null}
        {emptyRanking ? (
          <p className="py-3 text-xs text-[var(--text-soft)]">{emptyRanking}</p>
        ) : (
          <OwnerTodayRankingList garconRanking={garconRanking} />
        )}
      </div>

      <div className="border-t border-[var(--border)] px-4 py-3">
        <OwnerTodayTopProductsHeader leadProductName={topProdutos[0]?.nome ?? null} />
        {emptyTopProducts ? (
          <p className="py-3 text-xs text-[var(--text-soft)]">{emptyTopProducts}</p>
        ) : (
          <OwnerTodayTopProductsList items={topProductsBars} />
        )}
      </div>
    </section>
  )
}

function OwnerTodayRadarHeader() {
  return (
    <div className="flex items-center gap-2">
      <Package className="size-3.5 text-[var(--text-soft)]" />
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Ranking garçons</p>
    </div>
  )
}

function OwnerTodayPerformerChipList({
  garconSnapshots,
  selectedPerformer,
  setSelectedPerformer,
}: {
  garconSnapshots: PerformerSnapshot[]
  selectedPerformer: string
  setSelectedPerformer: (value: string) => void
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <OwnerTodayPerformerChip
        isActive={selectedPerformer === 'all'}
        label="Equipe inteira"
        testId="owner-today-performer-all"
        onClick={() => setSelectedPerformer('all')}
      />
      {garconSnapshots.map((performer) => (
        <OwnerTodayPerformerChip
          isActive={selectedPerformer === performer.nome}
          key={performer.nome}
          label={performer.nome}
          testId={`owner-today-performer-${slugify(performer.nome)}`}
          onClick={() => setSelectedPerformer(performer.nome)}
        />
      ))}
    </div>
  )
}

function OwnerTodayPerformerChip({
  isActive,
  label,
  onClick,
  testId,
}: {
  isActive: boolean
  label: string
  onClick: () => void
  testId: string
}) {
  return (
    <button
      className="rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all active:scale-95"
      data-testid={testId}
      style={{
        background: isActive ? 'rgba(167,139,250,0.18)' : 'var(--surface-muted)',
        border: `1px solid ${isActive ? 'rgba(167,139,250,0.36)' : 'var(--border)'}`,
        color: isActive ? '#c4b5fd' : 'var(--text-soft)',
      }}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function OwnerTodayPerformerSnapshot({ snapshot }: { snapshot: PerformerSnapshot }) {
  const stats = buildSelectedPerformerStats(snapshot)

  return (
    <div className="mt-3 overflow-hidden rounded-[18px] bg-[var(--border)]">
      <div className="grid grid-cols-2 gap-px sm:grid-cols-4">
        {stats.map((item) => (
          <div className="bg-[var(--surface-muted)] px-3 py-3" key={item.label}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
              {item.label}
            </p>
            <p className="mt-1 text-base font-bold leading-tight" style={{ color: item.tone }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function OwnerTodayRankingList({ garconRanking }: { garconRanking: Performer[] }) {
  return (
    <ul className="mt-2 divide-y divide-[var(--border)]">
      {garconRanking.map((garcom, index) => {
        const LeadIcon = getPerformerLeadLabel(index)
        return (
          <li className="flex items-center justify-between gap-3 py-3" key={garcom.nome}>
            <div className="min-w-0 flex items-center gap-2.5">
              <span className="flex size-6 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[10px] font-bold">
                {LeadIcon ? <LeadIcon className="size-3 text-[#eab308]" /> : `#${index + 1}`}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{garcom.nome}</p>
                <p className="text-[11px] text-[var(--text-soft)]">{garcom.comandas} comandas no turno</p>
              </div>
            </div>
            <span className="shrink-0 text-sm font-semibold text-[#36f57c]">{formatCurrency(garcom.valor)}</span>
          </li>
        )
      })}
    </ul>
  )
}

function OwnerTodayTopProductsHeader({ leadProductName }: { leadProductName: string | null }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Package className="size-3.5 text-[var(--text-soft)]" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Top produtos</p>
      </div>
      {leadProductName ? <span className="text-[10px] text-[var(--text-soft)]">{leadProductName}</span> : null}
    </div>
  )
}

function OwnerTodayTopProductsList({ items }: { items: Array<TopProduct & { pct: number; tone: string }> }) {
  return (
    <ul className="mt-2 divide-y divide-[var(--border)]">
      {items.map((produto) => (
        <li className="py-3" key={produto.nome}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{produto.nome}</p>
              <p className="mt-1 text-[11px] text-[var(--text-soft)]">{produto.qtd} unidades no turno</p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-[#60a5fa]">{formatCurrency(produto.valor)}</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--surface-muted)]">
            <div
              className="h-1.5 rounded-full transition-all"
              style={{ background: produto.tone, width: `${produto.pct}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
