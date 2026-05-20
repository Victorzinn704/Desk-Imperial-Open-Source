'use client'

import { useMemo, type ComponentPropsWithoutRef } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { ProductPayload } from '@/lib/api'
import { currencyCodeSchema } from '@/lib/validation'
import { LabFactPill, LabStatusPill, type LabStatusTone } from '@/components/design-lab/lab-primitives'

const quickRegisterProductSchema = z
  .object({
    name: z.string().trim().min(2, 'Digite um nome de produto válido.').max(120, 'O nome ficou longo demais.'),
    brand: z.string().trim().max(80, 'A marca ficou longa demais.').optional().or(z.literal('')),
    category: z.string().trim().min(2, 'Informe uma categoria.').max(80, 'A categoria ficou longa demais.'),
    packagingClass: z.string().trim().min(2, 'Informe a classe de cadastro.').max(120, 'A classe ficou longa demais.'),
    description: z.string().trim().max(280, 'A descrição ficou longa demais.').optional().or(z.literal('')),
    unitCost: z.coerce.number().min(0, 'O custo não pode ser negativo.'),
    unitPrice: z.coerce.number().min(0, 'O preço não pode ser negativo.'),
    stockBaseUnits: z.coerce.number().int('Use um número inteiro.').min(0, 'O estoque não pode ser negativo.'),
    lowStockThreshold: z.preprocess(
      (value) => (value === '' || value === undefined ? null : value),
      z.coerce.number().int('Use um número inteiro.').min(0, 'O limite não pode ser negativo.').nullable(),
    ),
    currency: currencyCodeSchema.default('BRL'),
    requiresKitchen: z.boolean().default(false),
  })
  .transform((values) => ({
    name: values.name,
    brand: values.brand,
    category: values.category,
    packagingClass: values.packagingClass,
    measurementUnit: 'UN',
    measurementValue: 1,
    unitsPerPackage: 1,
    isCombo: false,
    comboDescription: '',
    comboItems: [],
    description: values.description,
    unitCost: values.unitCost,
    unitPrice: values.unitPrice,
    currency: values.currency,
    stock: values.stockBaseUnits,
    lowStockThreshold: values.lowStockThreshold,
    requiresKitchen: values.requiresKitchen,
  }))

type QuickRegisterProductFormInput = z.input<typeof quickRegisterProductSchema>
type QuickRegisterProductFormValues = z.output<typeof quickRegisterProductSchema>

const defaultValues: QuickRegisterProductFormInput = {
  name: '',
  brand: '',
  category: '',
  packagingClass: 'Cadastro rápido',
  description: '',
  unitCost: 0,
  unitPrice: 0,
  stockBaseUnits: 0,
  lowStockThreshold: null,
  currency: 'BRL',
  requiresKitchen: false,
}

export function QuickRegisterProductForm({
  busy,
  capturedCode,
  capturedCodeValid,
  errorMessage,
  onSubmit,
}: Readonly<{
  busy: boolean
  capturedCode: string
  capturedCodeValid: boolean
  errorMessage: string | null
  onSubmit: (payload: ProductPayload) => Promise<unknown>
}>) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuickRegisterProductFormInput, undefined, QuickRegisterProductFormValues>({
    resolver: zodResolver(quickRegisterProductSchema),
    defaultValues,
  })

  const requiresKitchen = watch('requiresKitchen')
  const stockBaseUnits = watch('stockBaseUnits')
  const lowStockThreshold = watch('lowStockThreshold')
  const barcodeTone: LabStatusTone = capturedCode.length === 0 ? 'neutral' : capturedCodeValid ? 'success' : 'warning'
  const barcodeLabel = useMemo(() => {
    if (capturedCode.length === 0) {
      return 'sem leitura'
    }

    return capturedCodeValid ? `${capturedCode.length} dígitos` : 'incompleto'
  }, [capturedCode, capturedCodeValid])

  return (
    <div className="space-y-5 xl:border-l xl:border-[var(--lab-border)] xl:pl-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lab-fg-soft)]">
            persistência real
          </p>
          <h3 className="text-base font-semibold text-[var(--lab-fg)]">Cadastro direto no banco</h3>
          <p className="text-sm leading-6 text-[var(--lab-fg-soft)]">
            O produto já nasce no catálogo real pela API atual. Quando a leitura estiver válida, o EAN também segue
            junto para o domínio do produto.
          </p>
        </div>
        <LabStatusPill tone={busy ? 'warning' : 'info'}>{busy ? 'salvando' : 'api ativa'}</LabStatusPill>
      </div>

      <div className="flex flex-wrap gap-2">
        <LabFactPill label="medida" value="1 UN" />
        <LabFactPill label="caixa" value="1 und" />
        <LabFactPill label="moeda" value="BRL" />
        <LabFactPill label="captura" value={barcodeLabel} />
      </div>

      <form
        className="space-y-5"
        onSubmit={handleSubmit(async (values) => {
          await onSubmit({
            ...values,
            barcode: capturedCodeValid ? capturedCode : undefined,
          })
          reset(defaultValues)
        })}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <QuickRegisterField
            error={errors.name?.message}
            label="Nome"
            placeholder="Ex.: Brahma 350ml"
            {...register('name')}
          />
          <QuickRegisterField
            error={errors.brand?.message}
            label="Marca"
            placeholder="Ex.: Brahma"
            {...register('brand')}
          />
          <QuickRegisterField
            error={errors.category?.message}
            label="Categoria"
            placeholder="Ex.: Cervejas"
            {...register('category')}
          />
          <QuickRegisterField
            error={errors.packagingClass?.message}
            label="Classe de cadastro"
            placeholder="Ex.: Lata 350ml"
            {...register('packagingClass')}
          />
          <QuickRegisterField
            error={errors.unitCost?.message}
            label="Custo unitário"
            min="0"
            step="0.01"
            type="number"
            {...register('unitCost')}
          />
          <QuickRegisterField
            error={errors.unitPrice?.message}
            label="Preço unitário"
            min="0"
            step="0.01"
            type="number"
            {...register('unitPrice')}
          />
          <QuickRegisterField
            error={errors.stockBaseUnits?.message}
            label="Estoque base"
            min="0"
            step="1"
            type="number"
            {...register('stockBaseUnits')}
          />
          <QuickRegisterField
            error={errors.lowStockThreshold?.message}
            label="Alerta de estoque"
            min="0"
            placeholder="Opcional"
            step="1"
            type="number"
            {...register('lowStockThreshold')}
          />
        </div>

        <QuickRegisterTextArea
          error={errors.description?.message}
          label="Descrição"
          placeholder="Observação curta do item para o operador."
          {...register('description')}
        />

        <div className="grid gap-3 border-t border-dashed border-[var(--lab-border)] pt-4 sm:grid-cols-2">
          <QuickRegisterInlineStat label="estoque que entra" value={`${Number(stockBaseUnits ?? 0)} und`} />
          <QuickRegisterInlineStat
            label="alerta"
            value={lowStockThreshold == null ? 'desligado' : `${Number(lowStockThreshold)} und`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-dashed border-[var(--lab-border)] pt-4">
          <button
            aria-checked={requiresKitchen}
            className="inline-flex items-center gap-3 rounded-full border border-[var(--lab-border)] bg-[var(--lab-surface)] px-3 py-2 text-sm text-[var(--lab-fg)] transition hover:border-[var(--lab-border-strong)]"
            role="switch"
            type="button"
            onClick={() => setValue('requiresKitchen', !requiresKitchen, { shouldDirty: true, shouldValidate: true })}
          >
            <span
              className={`relative h-6 w-11 rounded-full transition ${requiresKitchen ? 'bg-[var(--lab-blue)]' : 'bg-[var(--lab-surface-hover)]'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition ${requiresKitchen ? 'translate-x-5' : ''}`}
              />
            </span>
            Envia para cozinha
          </button>

          <LabStatusPill tone={barcodeTone}>
            {capturedCode.length === 0
              ? 'sem código na leitura'
              : capturedCodeValid
                ? `leitura ${capturedCode}`
                : 'código ainda parcial'}
          </LabStatusPill>
        </div>

        {errorMessage ? <p className="text-sm text-[var(--lab-danger)]">{errorMessage}</p> : null}

        <div className="flex flex-col-reverse gap-3 border-t border-dashed border-[var(--lab-border)] pt-5 sm:flex-row sm:items-center sm:justify-end">
          <button
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--lab-border)] bg-[var(--lab-surface)] px-4 text-sm font-medium text-[var(--lab-fg)] transition hover:bg-[var(--lab-surface-hover)]"
            type="button"
            onClick={() => reset(defaultValues)}
          >
            Limpar
          </button>
          <button
            className="inline-flex h-11 items-center justify-center rounded-xl border border-transparent bg-[var(--lab-blue)] px-5 text-sm font-medium text-white transition hover:bg-[color:color-mix(in_srgb,var(--lab-blue)_82%,white_18%)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            type="submit"
          >
            {busy ? 'Cadastrando...' : 'Cadastrar agora'}
          </button>
        </div>
      </form>
    </div>
  )
}

type FieldProps = ComponentPropsWithoutRef<'input'> & {
  label: string
  error?: string
}

function QuickRegisterField({ label, error, className, ...props }: Readonly<FieldProps>) {
  return (
    <label className="block space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lab-fg-soft)]">{label}</span>
      <input
        className={`h-11 w-full rounded-xl border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-3 text-sm text-[var(--lab-fg)] outline-none transition placeholder:text-[var(--lab-fg-muted)] focus:border-[var(--lab-blue-border)] ${className ?? ''}`}
        {...props}
      />
      {error ? <span className="text-xs text-[var(--lab-danger)]">{error}</span> : null}
    </label>
  )
}

type TextAreaProps = ComponentPropsWithoutRef<'textarea'> & {
  label: string
  error?: string
}

function QuickRegisterTextArea({ label, error, className, ...props }: Readonly<TextAreaProps>) {
  return (
    <label className="block space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lab-fg-soft)]">{label}</span>
      <textarea
        className={`min-h-[96px] w-full rounded-xl border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-3 py-3 text-sm text-[var(--lab-fg)] outline-none transition placeholder:text-[var(--lab-fg-muted)] focus:border-[var(--lab-blue-border)] ${className ?? ''}`}
        {...props}
      />
      {error ? <span className="text-xs text-[var(--lab-danger)]">{error}</span> : null}
    </label>
  )
}

function QuickRegisterInlineStat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lab-fg-soft)]">{label}</p>
      <p className="text-sm font-medium text-[var(--lab-fg)]">{value}</p>
    </div>
  )
}
