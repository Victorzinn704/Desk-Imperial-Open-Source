import { ClipboardList, LoaderCircle, Plus, TriangleAlert, WifiOff } from 'lucide-react'
import { OperationEmptyState } from '@/components/operations/operation-empty-state'

type MobileComandaListEmptyStateProps = {
  errorMessage: string | null
  isBusy: boolean
  isLoading: boolean
  isOffline: boolean
  onNewComanda?: () => void
}

export function MobileComandaListEmptyState({
  errorMessage,
  isBusy,
  isLoading,
  isOffline,
  onNewComanda,
}: Readonly<MobileComandaListEmptyStateProps>) {
  if (isLoading) {
    return (
      <OperationEmptyState
        Icon={LoaderCircle}
        description="Buscando comandas abertas do salão."
        title="Carregando comandas"
      />
    )
  }

  if (errorMessage) {
    return (
      <OperationEmptyState
        Icon={TriangleAlert}
        description={errorMessage}
        title="Não foi possível carregar as comandas"
      />
    )
  }

  if (isOffline) {
    return (
      <OperationEmptyState
        Icon={WifiOff}
        description="Reconecte para consultar o estado atual das comandas do salão."
        title="Sem conexão para listar comandas"
      />
    )
  }

  return (
    <OperationEmptyState
      Icon={ClipboardList}
      action={<NewComandaButton isBusy={isBusy} onNewComanda={onNewComanda} />}
      description="Abra uma mesa ou retome uma comanda em andamento para continuar a operação."
      title="Nenhuma comanda ativa no salão"
    />
  )
}

function NewComandaButton({
  isBusy,
  onNewComanda,
}: Readonly<{
  isBusy: boolean
  onNewComanda?: () => void
}>) {
  if (!onNewComanda) {
    return null
  }

  return (
    <button
      className="flex items-center gap-2 rounded-xl bg-[rgba(0,140,255,0.15)] px-5 py-2.5 text-sm font-semibold text-[var(--accent,#008cff)] transition-opacity active:opacity-70 disabled:opacity-50"
      disabled={isBusy}
      type="button"
      onClick={onNewComanda}
    >
      <Plus className="size-4" />
      Nova comanda
    </button>
  )
}

export function MobileComandaListBanner({
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
        Você está offline. As comandas exibidas podem estar desatualizadas até a reconexão.
      </div>
    )
  }

  return null
}
