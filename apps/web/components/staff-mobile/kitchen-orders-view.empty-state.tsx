import { ChefHat, LoaderCircle, TriangleAlert, WifiOff } from 'lucide-react'
import { OperationEmptyState } from '@/components/operations/operation-empty-state'
import { getTonePanelStyle, resolveToneColor, STATUS_CONFIG } from './kitchen-orders-view.helpers'
import type { KitchenTab } from './kitchen-orders-view.types'

export function KitchenEmptyLoader() {
  return (
    <OperationEmptyState
      Icon={LoaderCircle}
      description="Buscando itens em preparo e pendências."
      title="Carregando fila da cozinha"
    />
  )
}

export function KitchenEmptyError({ errorMessage }: Readonly<{ errorMessage: string }>) {
  return (
    <OperationEmptyState Icon={TriangleAlert} description={errorMessage} title="Não foi possível carregar a cozinha" />
  )
}

export function KitchenEmptyOffline() {
  return (
    <OperationEmptyState
      Icon={WifiOff}
      description="Reconecte para sincronizar os pedidos da cozinha."
      title="Sem conexão para listar a cozinha"
    />
  )
}

export function KitchenEmptyFree() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <ChefHat className="size-7 text-[var(--text-soft)]" />
      </div>
      <p className="text-sm font-medium text-[var(--text-primary)]" data-testid="kitchen-view-empty">
        Cozinha livre
      </p>
      <p className="mt-1 text-xs text-[var(--text-soft)]">Nenhum pedido aguardando preparo</p>
    </div>
  )
}

export function KitchenEmptyTab({ activeTab }: Readonly<{ activeTab: KitchenTab }>) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm text-[var(--text-soft)]">Nenhum item {STATUS_CONFIG[activeTab].label.toLowerCase()}</p>
    </div>
  )
}

export function BannerBox({
  text,
  tone,
}: Readonly<{
  text: string
  tone: 'danger' | 'warning'
}>) {
  return (
    <div
      className="mx-4 mt-4 rounded-2xl border px-4 py-3 text-xs"
      style={{ ...getTonePanelStyle(tone), color: resolveToneColor(tone) }}
    >
      {text}
    </div>
  )
}
