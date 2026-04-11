import { memo } from 'react'
import { X } from 'lucide-react'
import { Field } from './field'
import type { CreateForm, EditForm } from '../constants'

// ── Modal Shell ───────────────────────────────────────────────────────────────

interface ModalProps {
  title: string
  children: React.ReactNode
  onClose: () => void
}

export const Modal = memo(function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="imperial-card w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
          <button
            className="rounded-lg p-1.5 text-[var(--text-soft)] transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--text-primary)]"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
})

// ── Create Mesa Modal ─────────────────────────────────────────────────────────

interface CreateMesaModalProps {
  form: CreateForm
  onChange: React.Dispatch<React.SetStateAction<CreateForm>>
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onClose: () => void
  isPending: boolean
  error: string | null
}

export const CreateMesaModal = memo(function CreateMesaModal({
  form,
  onChange,
  onSubmit,
  onClose,
  isPending,
  error,
}: CreateMesaModalProps) {
  return (
    <Modal title="Nova Mesa" onClose={onClose}>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="flex items-center gap-1 rounded-xl bg-[rgba(255,255,255,0.04)] p-1">
          {(['single', 'bulk'] as const).map((mode) => (
            <button
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                form.mode === mode
                  ? 'bg-[var(--accent)] text-black'
                  : 'text-[var(--text-soft)] hover:text-[var(--text-primary)]'
              }`}
              key={mode}
              type="button"
              onClick={() => onChange((f) => ({ ...f, mode }))}
            >
              {mode === 'single' ? 'Mesa única' : 'Criar várias de uma vez'}
            </button>
          ))}
        </div>

        {form.mode === 'single' ? (
          <>
            <Field label="Nome da mesa *">
              <input
                autoFocus
                className="imperial-input w-full"
                maxLength={40}
                placeholder="Ex: Mesa 1, VIP, Varanda"
                value={form.label}
                onChange={(e) => onChange((f) => ({ ...f, label: e.target.value }))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Capacidade">
                <input
                  className="imperial-input w-full"
                  min={1}
                  type="number"
                  value={form.capacity}
                  onChange={(e) => onChange((f) => ({ ...f, capacity: e.target.value }))}
                />
              </Field>
              <Field label="Seção">
                <input
                  className="imperial-input w-full"
                  placeholder="Salão, Varanda, Bar…"
                  value={form.section}
                  onChange={(e) => onChange((f) => ({ ...f, section: e.target.value }))}
                />
              </Field>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Prefixo">
                <input
                  className="imperial-input w-full"
                  placeholder="Mesa"
                  value={form.bulkPrefix}
                  onChange={(e) => onChange((f) => ({ ...f, bulkPrefix: e.target.value }))}
                />
              </Field>
              <Field label="De">
                <input
                  className="imperial-input w-full"
                  min={1}
                  type="number"
                  value={form.bulkFrom}
                  onChange={(e) => onChange((f) => ({ ...f, bulkFrom: e.target.value }))}
                />
              </Field>
              <Field label="Até">
                <input
                  className="imperial-input w-full"
                  min={1}
                  type="number"
                  value={form.bulkTo}
                  onChange={(e) => onChange((f) => ({ ...f, bulkTo: e.target.value }))}
                />
              </Field>
            </div>
            <p className="rounded-lg bg-[rgba(195,164,111,0.08)] px-3 py-2 text-xs text-[var(--text-soft)]">
              Criará:{' '}
              <strong className="text-[var(--accent)]">
                {form.bulkPrefix || 'Mesa'} {form.bulkFrom}
              </strong>{' '}
              até{' '}
              <strong className="text-[var(--accent)]">
                {form.bulkPrefix || 'Mesa'} {form.bulkTo}
              </strong>{' '}
              — {Math.max(0, Number.parseInt(form.bulkTo, 10) - Number.parseInt(form.bulkFrom, 10) + 1) || 0} mesas
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Capacidade padrão">
                <input
                  className="imperial-input w-full"
                  min={1}
                  type="number"
                  value={form.capacity}
                  onChange={(e) => onChange((f) => ({ ...f, capacity: e.target.value }))}
                />
              </Field>
              <Field label="Seção">
                <input
                  className="imperial-input w-full"
                  placeholder="Opcional"
                  value={form.section}
                  onChange={(e) => onChange((f) => ({ ...f, section: e.target.value }))}
                />
              </Field>
            </div>
          </>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-soft)] transition-colors hover:text-[var(--text-primary)]"
            type="button"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-50"
            disabled={isPending}
            type="submit"
          >
            {isPending ? 'Criando…' : 'Criar'}
          </button>
        </div>
      </form>
    </Modal>
  )
})

// ── Edit Mesa Modal ───────────────────────────────────────────────────────────

interface EditMesaModalProps {
  mesaLabel: string
  form: EditForm
  onChange: React.Dispatch<React.SetStateAction<EditForm>>
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onClose: () => void
  isPending: boolean
  error: string | null
}

export const EditMesaModal = memo(function EditMesaModal({
  mesaLabel,
  form,
  onChange,
  onSubmit,
  onClose,
  isPending,
  error,
}: EditMesaModalProps) {
  return (
    <Modal title={`Editar — ${mesaLabel}`} onClose={onClose}>
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="Nome da mesa *">
          <input
            autoFocus
            className="imperial-input w-full"
            maxLength={40}
            value={form.label}
            onChange={(e) => onChange((f) => ({ ...f, label: e.target.value }))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Capacidade">
            <input
              className="imperial-input w-full"
              min={1}
              type="number"
              value={form.capacity}
              onChange={(e) => onChange((f) => ({ ...f, capacity: e.target.value }))}
            />
          </Field>
          <Field label="Seção">
            <input
              className="imperial-input w-full"
              placeholder="Salão, Varanda, Bar…"
              value={form.section}
              onChange={(e) => onChange((f) => ({ ...f, section: e.target.value }))}
            />
          </Field>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-soft)] transition-colors hover:text-[var(--text-primary)]"
            type="button"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-50"
            disabled={isPending}
            type="submit"
          >
            {isPending ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  )
})
