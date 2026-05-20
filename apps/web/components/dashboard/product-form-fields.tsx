import type { useForm } from 'react-hook-form'
import { InputField } from '@/components/shared/input-field'
import type { ProductFormInputValues } from '@/lib/validation'

export function PackagingClassField({
  isManual,
  error,
  value,
  register,
  appearance = 'default',
}: {
  isManual: boolean
  error?: string
  value: string
  register: ReturnType<typeof useForm<ProductFormInputValues>>['register']
  appearance?: 'default' | 'embedded'
}) {
  if (isManual) {
    return (
      <InputField
        error={error}
        hint="Descreva como esse item entra no estoque: caixa, fardo, pacote ou outro formato."
        label="Classe personalizada"
        placeholder="Ex.: Caixa com 10 und de 1kg"
        {...register('packagingClass')}
      />
    )
  }
  return (
    <>
      {appearance === 'embedded' ? (
        <div className="grid gap-3 border-t border-dashed border-[var(--border)] pt-4 sm:grid-cols-2">
          <InlineReading label="classe ativa" value={value || 'Selecione um padrão para preencher automaticamente.'} />
          <InlineReading label="origem" value="perfil pronto de cadastro" />
        </div>
      ) : (
        <div className="imperial-card-soft px-4 py-4 text-sm text-[var(--text-soft)]">
          <p className="font-medium text-[var(--text-primary)]">Classe ativa</p>
          <p className="mt-2">{value || 'Selecione um dos padrões para preencher automaticamente.'}</p>
        </div>
      )}
      <input type="hidden" value={value} {...register('packagingClass')} />
    </>
  )
}

export function MeasurementUnitField({
  isManual,
  error,
  value,
  register,
}: {
  isManual: boolean
  error?: string
  value: string
  register: ReturnType<typeof useForm<ProductFormInputValues>>['register']
}) {
  if (isManual) {
    return (
      <InputField
        error={error}
        label="Outra unidade de medida"
        placeholder="Ex.: pacote, saco, porção"
        {...register('measurementUnit')}
      />
    )
  }
  return <input type="hidden" value={value} {...register('measurementUnit')} />
}

export function ProductSectionHeader({
  eyebrow,
  title,
  description,
}: Readonly<{
  eyebrow: string
  title: string
  description: string
}>) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">{eyebrow}</p>
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="text-sm leading-6 text-[var(--text-soft)]">{description}</p>
    </div>
  )
}

export function InlineReading({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</p>
      <p className="text-sm font-medium text-[var(--text-primary)]">{value}</p>
    </div>
  )
}
