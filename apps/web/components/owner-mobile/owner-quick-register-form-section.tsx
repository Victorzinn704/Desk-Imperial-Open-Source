import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import type { FormEventHandler } from 'react'
import { CloudOff, PackagePlus } from 'lucide-react'
import { formatBRL as formatCurrency } from '@/lib/currency'
import { OwnerField } from './owner-quick-register-field'
import type { OwnerQuickRegisterInput } from './owner-quick-register-model'

export function OwnerQuickRegisterFormSection({
  canSubmit,
  createError,
  errors,
  isPending,
  onDrain,
  onSubmit,
  queuedCount,
  register,
  stockBaseUnits,
  stockValue,
}: Readonly<{
  canSubmit: boolean
  createError: string | null
  errors: FieldErrors<OwnerQuickRegisterInput>
  isPending: boolean
  onDrain: () => void
  onSubmit: FormEventHandler<HTMLFormElement>
  queuedCount: number
  register: UseFormRegister<OwnerQuickRegisterInput>
  stockBaseUnits: number
  stockValue: number
}>) {
  return (
    <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <FormHeader />
      <form className="mt-4 space-y-4" onSubmit={onSubmit}>
        <ProductIdentityFields errors={errors} register={register} />
        <ProductCommercialFields errors={errors} register={register} />
        <QuickReadout stockBaseUnits={stockBaseUnits} stockValue={stockValue} />
        {createError ? <CreateErrorPanel message={createError} /> : null}
        <SubmitAction canSubmit={canSubmit} isPending={isPending} />
        {queuedCount > 0 ? <OfflineQueueAction queuedCount={queuedCount} onDrain={onDrain} /> : null}
      </form>
    </section>
  )
}

function FormHeader() {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
          Cadastro manual
        </p>
        <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Dados mínimos do produto</h2>
      </div>
      <span className="rounded-full border border-[rgba(0,140,255,0.2)] bg-[rgba(0,140,255,0.08)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent,#008cff)]">
        móvel
      </span>
    </div>
  )
}

function ProductIdentityFields({
  errors,
  register,
}: Readonly<{
  errors: FieldErrors<OwnerQuickRegisterInput>
  register: UseFormRegister<OwnerQuickRegisterInput>
}>) {
  return (
    <>
      <OwnerField error={errors.name?.message} label="Nome" placeholder="Ex.: Guaraná Lata" {...register('name')} />
      <div className="grid grid-cols-2 gap-3">
        <OwnerField error={errors.brand?.message} label="Marca" placeholder="Ex.: Antárctica" {...register('brand')} />
        <OwnerField
          error={errors.category?.message}
          label="Categoria"
          placeholder="Ex.: Bebidas"
          {...register('category')}
        />
      </div>
    </>
  )
}

function ProductCommercialFields({
  errors,
  register,
}: Readonly<{
  errors: FieldErrors<OwnerQuickRegisterInput>
  register: UseFormRegister<OwnerQuickRegisterInput>
}>) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <OwnerField
        error={errors.unitCost?.message}
        label="Custo"
        min="0"
        step="0.01"
        type="number"
        {...register('unitCost')}
      />
      <OwnerField
        error={errors.unitPrice?.message}
        label="Venda"
        min="0"
        step="0.01"
        type="number"
        {...register('unitPrice')}
      />
      <OwnerField
        error={errors.stockBaseUnits?.message}
        label="Estoque"
        min="0"
        step="1"
        type="number"
        {...register('stockBaseUnits')}
      />
    </div>
  )
}

function QuickReadout({ stockBaseUnits, stockValue }: Readonly<{ stockBaseUnits: number; stockValue: number }>) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
            Leitura rápida
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(stockValue)}</p>
        </div>
        <div className="text-right text-xs text-[var(--text-soft)]">
          <p>{stockBaseUnits} und base</p>
          <p>classe padrão: cadastro rápido móvel</p>
        </div>
      </div>
    </div>
  )
}

function CreateErrorPanel({ message }: Readonly<{ message: string }>) {
  return (
    <div className="rounded-2xl border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-xs text-[#fca5a5]">
      {message}
    </div>
  )
}

function SubmitAction({ canSubmit, isPending }: Readonly<{ canSubmit: boolean; isPending: boolean }>) {
  return (
    <button
      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[rgba(0,140,255,0.24)] bg-[var(--accent,#008cff)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      disabled={!canSubmit}
      type="submit"
    >
      <PackagePlus className="size-4" />
      {isPending ? 'Cadastrando...' : 'Cadastrar produto'}
    </button>
  )
}

function OfflineQueueAction({ onDrain, queuedCount }: Readonly<{ onDrain: () => void; queuedCount: number }>) {
  return (
    <button
      className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 text-sm font-semibold text-[var(--text-primary)]"
      type="button"
      onClick={onDrain}
    >
      <CloudOff className="size-4" />
      Sincronizar fila offline ({queuedCount})
    </button>
  )
}
