import { type ChangeEvent, type InputHTMLAttributes, useCallback } from 'react'
import type { CreateForm, EditForm } from '../constants'
import { Field } from './field'

const inputClassName =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]'

const errorStyle = {
  backgroundColor: 'color-mix(in srgb, var(--danger) 10%, var(--surface))',
  borderColor: 'color-mix(in srgb, var(--danger) 30%, var(--border))',
}

export type CreateFieldChange = <Field extends keyof CreateForm>(field: Field, value: CreateForm[Field]) => void
export type EditFieldChange = <Field extends keyof EditForm>(field: Field, value: EditForm[Field]) => void
type CreateTextField = Exclude<keyof CreateForm, 'mode'>
type CoreMesaField = keyof EditForm
type CoreMesaValues = Pick<CreateForm, CoreMesaField>
type FieldValueChange<Field extends string> = (field: Field, value: string) => void
type CreateTextFieldChange = FieldValueChange<CreateTextField>
type CoreFieldChange = FieldValueChange<CoreMesaField>

export function CreateModeTabs({
  mode,
  onModeChange,
}: Readonly<{ mode: CreateForm['mode']; onModeChange: (mode: CreateForm['mode']) => void }>) {
  return (
    <div className="inline-flex rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-1">
      {(['single', 'bulk'] as const).map((option) => (
        <CreateModeButton active={mode === option} key={option} mode={option} onModeChange={onModeChange} />
      ))}
    </div>
  )
}

export function SingleMesaFields({
  form,
  onFieldChange,
}: Readonly<{ form: CreateForm; onFieldChange: CreateFieldChange }>) {
  const handleCoreFieldChange = useCreateCoreFieldChange(onFieldChange)

  return (
    <MesaCoreFields labelPlaceholder="Ex: Mesa 1, VIP, Varanda" values={form} onFieldChange={handleCoreFieldChange} />
  )
}

export function BulkMesaFields({
  form,
  onFieldChange,
}: Readonly<{ form: CreateForm; onFieldChange: CreateFieldChange }>) {
  const handleTextFieldChange = useCreateTextFieldChange(onFieldChange)
  const handleCoreFieldChange = useCreateCoreFieldChange(onFieldChange)

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Prefixo">
          <MesaFieldInput
            field="bulkPrefix"
            placeholder="Mesa"
            value={form.bulkPrefix}
            onFieldChange={handleTextFieldChange}
          />
        </Field>
        <Field label="De">
          <MesaFieldInput
            field="bulkFrom"
            min={1}
            type="number"
            value={form.bulkFrom}
            onFieldChange={handleTextFieldChange}
          />
        </Field>
        <Field label="Ate">
          <MesaFieldInput
            field="bulkTo"
            min={1}
            type="number"
            value={form.bulkTo}
            onFieldChange={handleTextFieldChange}
          />
        </Field>
      </div>
      <BulkPreview form={form} />
      <MesaCapacitySectionFields
        capacityLabel="Capacidade padrao"
        sectionPlaceholder="Opcional"
        values={form}
        onFieldChange={handleCoreFieldChange}
      />
    </>
  )
}

export function EditMesaFields({ form, onFieldChange }: Readonly<{ form: EditForm; onFieldChange: EditFieldChange }>) {
  const handleCoreFieldChange = useEditCoreFieldChange(onFieldChange)

  return <MesaCoreFields values={form} onFieldChange={handleCoreFieldChange} />
}

export function MesaFormError({ error }: Readonly<{ error: string | null }>) {
  return error ? (
    <p className="rounded-2xl border px-3 py-2 text-sm text-[var(--danger)]" style={errorStyle}>
      {error}
    </p>
  ) : null
}

export function MesaFormActions({
  isPending,
  pendingLabel,
  submitLabel,
  onClose,
}: Readonly<{ isPending: boolean; pendingLabel: string; submitLabel: string; onClose: () => void }>) {
  return (
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
        {isPending ? pendingLabel : submitLabel}
      </button>
    </div>
  )
}

function CreateModeButton({
  active,
  mode,
  onModeChange,
}: Readonly<{ active: boolean; mode: CreateForm['mode']; onModeChange: (mode: CreateForm['mode']) => void }>) {
  const handleClick = useCallback(() => onModeChange(mode), [mode, onModeChange])
  return (
    <button
      className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
        active
          ? 'border border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
          : 'text-[var(--text-soft)] hover:text-[var(--text-primary)]'
      }`}
      type="button"
      onClick={handleClick}
    >
      {mode === 'single' ? 'Mesa unica' : 'Criacao em lote'}
    </button>
  )
}

function BulkPreview({ form }: Readonly<{ form: CreateForm }>) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-soft)]">
      <p className="font-medium text-[var(--text-primary)]">Leitura do lote</p>
      <p className="mt-1 leading-6">
        {form.bulkPrefix || 'Mesa'} {form.bulkFrom} ate {form.bulkTo} com capacidade padrao de {form.capacity} lugares.
      </p>
    </div>
  )
}

function MesaCoreFields({
  labelPlaceholder,
  values,
  onFieldChange,
}: Readonly<{
  labelPlaceholder?: string
  values: CoreMesaValues
  onFieldChange: CoreFieldChange
}>) {
  return (
    <>
      <Field label="Nome da mesa *">
        <MesaCoreInput
          field="label"
          maxLength={40}
          placeholder={labelPlaceholder}
          value={values.label}
          onFieldChange={onFieldChange}
        />
      </Field>
      <MesaCapacitySectionFields values={values} onFieldChange={onFieldChange} />
    </>
  )
}

function MesaCapacitySectionFields({
  capacityLabel = 'Capacidade',
  sectionPlaceholder = 'Salao, varanda, bar',
  values,
  onFieldChange,
}: Readonly<{
  capacityLabel?: string
  sectionPlaceholder?: string
  values: CoreMesaValues
  onFieldChange: CoreFieldChange
}>) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={capacityLabel}>
        <MesaCoreInput field="capacity" min={1} type="number" value={values.capacity} onFieldChange={onFieldChange} />
      </Field>
      <Field label="Secao">
        <MesaCoreInput
          field="section"
          placeholder={sectionPlaceholder}
          value={values.section}
          onFieldChange={onFieldChange}
        />
      </Field>
    </div>
  )
}

function useCreateCoreFieldChange(onFieldChange: CreateFieldChange): CoreFieldChange {
  return useCallback((field, value) => onFieldChange(field, value), [onFieldChange])
}

function useCreateTextFieldChange(onFieldChange: CreateFieldChange): CreateTextFieldChange {
  return useCallback((field, value) => onFieldChange(field, value), [onFieldChange])
}

function useEditCoreFieldChange(onFieldChange: EditFieldChange): CoreFieldChange {
  return useCallback((field, value) => onFieldChange(field, value), [onFieldChange])
}

function MesaCoreInput({
  ...props
}: Readonly<InputHTMLAttributes<HTMLInputElement> & { field: CoreMesaField; onFieldChange: CoreFieldChange }>) {
  return <MesaFieldInput {...props} />
}

function MesaFieldInput<Field extends string>({
  field,
  onFieldChange,
  ...props
}: Readonly<InputHTMLAttributes<HTMLInputElement> & { field: Field; onFieldChange: FieldValueChange<Field> }>) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onFieldChange(field, event.target.value),
    [field, onFieldChange],
  )

  return <input className={inputClassName} {...props} onChange={handleChange} />
}
