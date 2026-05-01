import { memo, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from 'react'
import { X } from 'lucide-react'
import type { CreateForm, EditForm } from '../constants'
import { Field } from './field'

const inputClassName =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]'

interface ModalProps {
  title: string
  description: string
  children: ReactNode
  onClose: () => void
}

export const Modal = memo(function Modal({ title, description, children, onClose }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button
        aria-label="Fechar modal"
        className="absolute inset-0 border-0 p-0"
        style={{ backgroundColor: 'color-mix(in srgb, var(--bg) 70%, transparent)' }}
        type="button"
        onClick={onClose}
      />

      <div
        className="relative z-[1] w-full max-w-xl rounded-[28px] border border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-panel-strong)]"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">{description}</p>
          </div>
          <button
            className="inline-flex size-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-soft)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
            type="button"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  )
})

interface CreateMesaModalProps {
  form: CreateForm
  onChange: Dispatch<SetStateAction<CreateForm>>
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
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
    <Modal description="Cadastre mesas novas sem sair da leitura operacional." title="Nova mesa" onClose={onClose}>
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="inline-flex rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-1">
          {(['single', 'bulk'] as const).map((mode) => (
            <button
              className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
                form.mode === mode
                  ? 'border border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                  : 'text-[var(--text-soft)] hover:text-[var(--text-primary)]'
              }`}
              key={mode}
              type="button"
              onClick={() => onChange((current) => ({ ...current, mode }))}
            >
              {mode === 'single' ? 'Mesa unica' : 'Criacao em lote'}
            </button>
          ))}
        </div>

        {form.mode === 'single' ? (
          <>
            <Field label="Nome da mesa *">
              <input
                className={inputClassName}
                maxLength={40}
                placeholder="Ex: Mesa 1, VIP, Varanda"
                value={form.label}
                onChange={(event) => onChange((current) => ({ ...current, label: event.target.value }))}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Capacidade">
                <input
                  className={inputClassName}
                  min={1}
                  type="number"
                  value={form.capacity}
                  onChange={(event) => onChange((current) => ({ ...current, capacity: event.target.value }))}
                />
              </Field>
              <Field label="Secao">
                <input
                  className={inputClassName}
                  placeholder="Salao, varanda, bar"
                  value={form.section}
                  onChange={(event) => onChange((current) => ({ ...current, section: event.target.value }))}
                />
              </Field>
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Prefixo">
                <input
                  className={inputClassName}
                  placeholder="Mesa"
                  value={form.bulkPrefix}
                  onChange={(event) => onChange((current) => ({ ...current, bulkPrefix: event.target.value }))}
                />
              </Field>
              <Field label="De">
                <input
                  className={inputClassName}
                  min={1}
                  type="number"
                  value={form.bulkFrom}
                  onChange={(event) => onChange((current) => ({ ...current, bulkFrom: event.target.value }))}
                />
              </Field>
              <Field label="Ate">
                <input
                  className={inputClassName}
                  min={1}
                  type="number"
                  value={form.bulkTo}
                  onChange={(event) => onChange((current) => ({ ...current, bulkTo: event.target.value }))}
                />
              </Field>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-soft)]">
              <p className="font-medium text-[var(--text-primary)]">Leitura do lote</p>
              <p className="mt-1 leading-6">
                {form.bulkPrefix || 'Mesa'} {form.bulkFrom} ate {form.bulkTo} com capacidade padrao de {form.capacity}{' '}
                lugares.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Capacidade padrao">
                <input
                  className={inputClassName}
                  min={1}
                  type="number"
                  value={form.capacity}
                  onChange={(event) => onChange((current) => ({ ...current, capacity: event.target.value }))}
                />
              </Field>
              <Field label="Secao">
                <input
                  className={inputClassName}
                  placeholder="Opcional"
                  value={form.section}
                  onChange={(event) => onChange((current) => ({ ...current, section: event.target.value }))}
                />
              </Field>
            </div>
          </>
        )}

        {error ? (
          <p
            className="rounded-2xl border px-3 py-2 text-sm text-[var(--danger)]"
            style={{
              borderColor: 'color-mix(in srgb, var(--danger) 30%, var(--border))',
              backgroundColor: 'color-mix(in srgb, var(--danger) 10%, var(--surface))',
            }}
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
          <button
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-soft)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
            type="button"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            type="submit"
          >
            {isPending ? 'Criando...' : 'Criar mesa'}
          </button>
        </div>
      </form>
    </Modal>
  )
})

interface EditMesaModalProps {
  mesaLabel: string
  form: EditForm
  onChange: Dispatch<SetStateAction<EditForm>>
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
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
    <Modal
      description="Atualize nome, capacidade e secao sem perder a operacao em curso."
      title={`Editar ${mesaLabel}`}
      onClose={onClose}
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <Field label="Nome da mesa *">
          <input
            className={inputClassName}
            maxLength={40}
            value={form.label}
            onChange={(event) => onChange((current) => ({ ...current, label: event.target.value }))}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Capacidade">
            <input
              className={inputClassName}
              min={1}
              type="number"
              value={form.capacity}
              onChange={(event) => onChange((current) => ({ ...current, capacity: event.target.value }))}
            />
          </Field>
          <Field label="Secao">
            <input
              className={inputClassName}
              placeholder="Salao, varanda, bar"
              value={form.section}
              onChange={(event) => onChange((current) => ({ ...current, section: event.target.value }))}
            />
          </Field>
        </div>

        {error ? (
          <p
            className="rounded-2xl border px-3 py-2 text-sm text-[var(--danger)]"
            style={{
              borderColor: 'color-mix(in srgb, var(--danger) 30%, var(--border))',
              backgroundColor: 'color-mix(in srgb, var(--danger) 10%, var(--surface))',
            }}
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
          <button
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-soft)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
            type="button"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            type="submit"
          >
            {isPending ? 'Salvando...' : 'Salvar ajustes'}
          </button>
        </div>
      </form>
    </Modal>
  )
})
