import { type Dispatch, type FormEvent, memo, type ReactNode, type SetStateAction, useCallback } from 'react'
import { X } from 'lucide-react'
import type { CreateForm, EditForm } from '../constants'
import {
  BulkMesaFields,
  type CreateFieldChange,
  CreateModeTabs,
  type EditFieldChange,
  EditMesaFields,
  MesaFormActions,
  MesaFormError,
  SingleMesaFields,
} from './mesa-form-modal.sections'

const overlayStyle = {
  backgroundColor: 'color-mix(in srgb, var(--bg) 70%, transparent)',
}

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
        style={overlayStyle}
        type="button"
        onClick={onClose}
      />

      <dialog
        open
        aria-modal="true"
        className="relative z-[1] m-0 w-full max-w-xl rounded-[28px] border border-[var(--border-strong)] bg-[var(--surface)] p-0 shadow-[var(--shadow-panel-strong)]"
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
      </dialog>
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
  const handleFieldChange = useCallback<CreateFieldChange>(
    (field, value) => onChange((current) => ({ ...current, [field]: value })),
    [onChange],
  )
  const handleModeChange = useCallback(
    (mode: CreateForm['mode']) => handleFieldChange('mode', mode),
    [handleFieldChange],
  )

  return (
    <Modal description="Cadastre mesas novas sem sair da leitura operacional." title="Nova mesa" onClose={onClose}>
      <form className="space-y-5" onSubmit={onSubmit}>
        <CreateModeTabs mode={form.mode} onModeChange={handleModeChange} />
        <CreateMesaFields form={form} onFieldChange={handleFieldChange} />
        <MesaFormError error={error} />
        <MesaFormActions isPending={isPending} pendingLabel="Criando..." submitLabel="Criar mesa" onClose={onClose} />
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
  const handleFieldChange = useCallback<EditFieldChange>(
    (field, value) => onChange((current) => ({ ...current, [field]: value })),
    [onChange],
  )

  return (
    <Modal
      description="Atualize nome, capacidade e secao sem perder a operacao em curso."
      title={`Editar ${mesaLabel}`}
      onClose={onClose}
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <EditMesaFields form={form} onFieldChange={handleFieldChange} />
        <MesaFormError error={error} />
        <MesaFormActions
          isPending={isPending}
          pendingLabel="Salvando..."
          submitLabel="Salvar ajustes"
          onClose={onClose}
        />
      </form>
    </Modal>
  )
})

function CreateMesaFields({ form, onFieldChange }: Readonly<{ form: CreateForm; onFieldChange: CreateFieldChange }>) {
  return form.mode === 'single' ? (
    <SingleMesaFields form={form} onFieldChange={onFieldChange} />
  ) : (
    <BulkMesaFields form={form} onFieldChange={onFieldChange} />
  )
}
