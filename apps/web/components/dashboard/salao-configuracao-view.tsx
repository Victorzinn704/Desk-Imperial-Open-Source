import { Plus } from 'lucide-react'
import type { MesaRecord } from '@contracts/contracts'
import { MesaListCard } from './salao'

export function ConfiguracaoView({
  activeMesas,
  inactiveMesas,
  isPending,
  mesasLoading,
  onCreate,
  onEdit,
  onToggle,
}: Readonly<{
  activeMesas: MesaRecord[]
  inactiveMesas: MesaRecord[]
  isPending: boolean
  mesasLoading: boolean
  onCreate: () => void
  onEdit: (mesa: MesaRecord) => void
  onToggle: (mesa: MesaRecord) => void
}>) {
  if (mesasLoading) {
    return <p className="text-sm text-[var(--text-soft)]">Carregando mesas...</p>
  }

  if (activeMesas.length === 0 && inactiveMesas.length === 0) {
    return <EmptyMesaConfiguration onCreate={onCreate} />
  }

  return (
    <div className="space-y-6">
      <MesaGroup isPending={isPending} mesas={activeMesas} title="Ativas" onEdit={onEdit} onToggle={onToggle} />
      <MesaGroup
        className="opacity-70"
        isPending={isPending}
        mesas={inactiveMesas}
        title="Inativas"
        onEdit={onEdit}
        onToggle={onToggle}
      />
    </div>
  )
}

function EmptyMesaConfiguration({ onCreate }: Readonly<{ onCreate: () => void }>) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">Nenhuma mesa cadastrada</h3>
      <p className="mt-2 text-sm text-[var(--text-soft)]">
        Crie a primeira mesa para liberar o mapa físico e a leitura operacional.
      </p>
      <button
        className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent-strong)] hover:bg-[var(--surface-soft)]"
        type="button"
        onClick={onCreate}
      >
        <Plus className="size-4" />
        Criar primeira mesa
      </button>
    </div>
  )
}

function MesaGroup({
  className = '',
  isPending,
  mesas,
  onEdit,
  onToggle,
  title,
}: Readonly<{
  className?: string
  isPending: boolean
  mesas: MesaRecord[]
  onEdit: (mesa: MesaRecord) => void
  onToggle: (mesa: MesaRecord) => void
  title: string
}>) {
  if (mesas.length === 0) {
    return null
  }

  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
        {title} — {mesas.length}
      </p>
      <div
        className={`grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 ${className}`}
      >
        {mesas.map((mesa) => (
          <MesaListCard
            isPending={isPending}
            key={mesa.id}
            mesa={mesa}
            onEdit={() => onEdit(mesa)}
            onToggle={() => onToggle(mesa)}
          />
        ))}
      </div>
    </div>
  )
}
