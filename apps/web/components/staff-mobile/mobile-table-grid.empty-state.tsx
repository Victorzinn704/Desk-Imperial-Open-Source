import { LayoutGrid, TriangleAlert, WifiOff } from 'lucide-react'
import { OperationEmptyState } from '@/components/operations/operation-empty-state'

export function MobileTableGridLoader() {
  return (
    <div className="p-3 pb-6 sm:p-4">
      <div className="mb-3 ml-1 h-3 w-32 animate-pulse rounded bg-[rgba(255,255,255,0.08)]" />
      <div className="grid grid-cols-2 gap-2.5 min-[420px]:grid-cols-3 min-[420px]:gap-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            className="min-h-[96px] animate-pulse rounded-[18px] border border-[var(--border)] bg-[var(--surface)]"
            key={index}
          />
        ))}
      </div>
    </div>
  )
}

export function MobileTableGridEmptyState({
  errorMessage,
  isOffline,
}: Readonly<{
  errorMessage: string | null
  isOffline: boolean
}>) {
  if (errorMessage) {
    return (
      <OperationEmptyState Icon={TriangleAlert} description={errorMessage} title="Não foi possível carregar as mesas" />
    )
  }

  if (isOffline) {
    return (
      <OperationEmptyState
        Icon={WifiOff}
        description="Reconecte para buscar o mapa atual das mesas."
        title="Sem conexão para listar mesas"
      />
    )
  }

  return (
    <OperationEmptyState
      Icon={LayoutGrid}
      description="As mesas são configuradas no painel web."
      title="Nenhuma mesa cadastrada"
    />
  )
}

export function MobileTableGridBanner({
  errorMessage,
  isOffline,
}: Readonly<{
  errorMessage: string | null
  isOffline: boolean
}>) {
  if (errorMessage) {
    return (
      <div className="mb-4 rounded-2xl border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-xs text-[#fca5a5]">
        {errorMessage}
      </div>
    )
  }

  if (isOffline) {
    return (
      <div className="mb-4 rounded-2xl border border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.08)] px-4 py-3 text-xs text-[#fcd34d]">
        Você está offline. As mesas podem estar desatualizadas até a reconexão.
      </div>
    )
  }

  return null
}
