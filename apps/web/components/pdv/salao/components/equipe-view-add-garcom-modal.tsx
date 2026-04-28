'use client'

type AddGarcomModalProps = {
  newNome: string
  onChangeNome: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}

export function AddGarcomModal({ newNome, onChangeNome, onClose, onConfirm }: Readonly<AddGarcomModalProps>) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xs rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
        <h3 className="mb-4 text-base font-bold text-[var(--text-primary)]">Novo Garçom</h3>
        <input
          autoFocus
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
          placeholder="Nome do garçom"
          type="text"
          value={newNome}
          onChange={(event) => onChangeNome(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && newNome.trim()) {
              onConfirm()
            }
          }}
        />
        <div className="mt-4 flex gap-3">
          <button
            className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm text-[var(--text-soft)] hover:border-[var(--border-strong)]"
            type="button"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-40"
            disabled={!newNome.trim()}
            style={{ background: 'var(--accent)' }}
            type="button"
            onClick={onConfirm}
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  )
}
