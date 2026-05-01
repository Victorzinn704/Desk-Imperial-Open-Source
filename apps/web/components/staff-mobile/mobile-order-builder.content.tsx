'use client'

import { OperationEmptyState } from '@/components/operations/operation-empty-state'
import { ShoppingCart } from 'lucide-react'
import { MobileOrderBuilderVirtualList } from './mobile-order-builder.virtual-list'
import type { MobileOrderBuilderProps } from './mobile-order-builder.types'

type MobileOrderBuilderContentProps = Readonly<{
  activeProdutos: MobileOrderBuilderProps['produtos']
  addItem: (produto: MobileOrderBuilderProps['produtos'][number]) => void
  busy?: boolean
  deferredSearch: string
  errorMessage?: string | null
  filtered: MobileOrderBuilderProps['produtos']
  getQty: (produtoId: string) => number
  isLoading?: boolean
  isOffline?: boolean
  onShowAllProducts: () => void
  removeItem: (produtoId: string) => void
  selectedCategory: string | null
  totalItems: number
}>

function MobileOrderBuilderLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 size-10 animate-spin rounded-full border-2 border-[var(--accent,#008cff)] border-t-transparent" />
      <p className="text-sm font-medium text-[var(--text-primary)]">Carregando produtos...</p>
      <p className="mt-1 text-xs text-[var(--text-soft,#7a8896)]">Aguarde o catálogo terminar de sincronizar.</p>
    </div>
  )
}

function MobileOrderBuilderEmptyState({
  activeCount,
  errorMessage,
  isOffline,
}: Readonly<{
  activeCount: number
  errorMessage?: string | null
  isOffline?: boolean
}>) {
  if (errorMessage && activeCount === 0) {
    return (
      <div className="px-4 py-6">
        <OperationEmptyState
          Icon={ShoppingCart}
          description={
            isOffline
              ? 'Sem conexão para carregar o catálogo agora.'
              : errorMessage || 'Não foi possível carregar os produtos agora.'
          }
          title={isOffline ? 'Sem conexão' : 'Falha ao carregar produtos'}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm text-[var(--text-soft,#7a8896)]">
        {activeCount === 0 ? 'Nenhum produto ativo no catálogo' : 'Nenhum produto encontrado'}
      </p>
    </div>
  )
}

function MobileOrderBuilderSectionHeader({
  deferredSearch,
  filteredCount,
  onShowAllProducts,
  selectedCategory,
}: Readonly<{
  deferredSearch: string
  filteredCount: number
  onShowAllProducts: () => void
  selectedCategory: string | null
}>) {
  return (
    <div className="border-b border-[var(--border)] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">
            {selectedCategory ?? (deferredSearch.trim().length > 0 ? 'Busca rápida' : 'Todos os produtos')}
          </p>
          <p className="mt-1 text-xs text-[var(--text-soft,#7a8896)]">{filteredCount} produtos disponíveis</p>
        </div>
        {selectedCategory ? (
          <button
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-soft,#7a8896)] transition-colors active:text-[var(--text-primary)]"
            type="button"
            onClick={onShowAllProducts}
          >
            Ver tudo
          </button>
        ) : null}
      </div>
    </div>
  )
}

function MobileOrderBuilderReadyState({
  addItem,
  busy,
  deferredSearch,
  filtered,
  getQty,
  onShowAllProducts,
  removeItem,
  selectedCategory,
  totalItems,
}: Readonly<{
  addItem: (produto: MobileOrderBuilderProps['produtos'][number]) => void
  busy?: boolean
  deferredSearch: string
  filtered: MobileOrderBuilderProps['produtos']
  getQty: (produtoId: string) => number
  onShowAllProducts: () => void
  removeItem: (produtoId: string) => void
  selectedCategory: string | null
  totalItems: number
}>) {
  return (
    <>
      <MobileOrderBuilderSectionHeader
        deferredSearch={deferredSearch}
        filteredCount={filtered.length}
        selectedCategory={selectedCategory}
        onShowAllProducts={onShowAllProducts}
      />
      <MobileOrderBuilderVirtualList
        addItem={addItem}
        busy={busy}
        filtered={filtered}
        getQty={getQty}
        removeItem={removeItem}
        totalItems={totalItems}
      />
    </>
  )
}

export function MobileOrderBuilderContent({
  activeProdutos,
  addItem,
  busy,
  deferredSearch,
  errorMessage,
  filtered,
  getQty,
  isLoading,
  isOffline,
  onShowAllProducts,
  removeItem,
  selectedCategory,
  totalItems,
}: MobileOrderBuilderContentProps) {
  if (isLoading && activeProdutos.length === 0) {
    return <MobileOrderBuilderLoadingState />
  }

  if (filtered.length === 0) {
    return (
      <MobileOrderBuilderEmptyState
        activeCount={activeProdutos.length}
        errorMessage={errorMessage}
        isOffline={isOffline}
      />
    )
  }

  return (
    <MobileOrderBuilderReadyState
      addItem={addItem}
      busy={busy}
      deferredSearch={deferredSearch}
      filtered={filtered}
      getQty={getQty}
      removeItem={removeItem}
      selectedCategory={selectedCategory}
      totalItems={totalItems}
      onShowAllProducts={onShowAllProducts}
    />
  )
}
